import { TFile, MarkdownView, App, Component, MarkdownRenderer, getAllTags } from 'obsidian';
import { CMDSShareSettings, SharedNote, ShareResult, ServerProviderType } from './types';
import { createServerProvider, ServerProvider, ShareMeta, RemoteNoteMeta } from './providers';
import { encryptString, generateShortId, sha1 } from './crypto';
import { generateNoteHtml } from './template';

const ASSET_MIME: Record<string, string> = {
	png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
	gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
	avif: 'image/avif', bmp: 'image/bmp',
};

export interface ShareOptions {
	encrypted?: boolean;
	expiresAt?: number;
}

export class ShareApiService {
	private settings: CMDSShareSettings;
	private provider: ServerProvider | null = null;

	constructor(settings: CMDSShareSettings) {
		this.settings = settings;
		this.initProvider();
	}

	updateSettings(settings: CMDSShareSettings): void {
		this.settings = settings;
		this.initProvider();
	}

	private initProvider(): void {
		const providerType = this.settings.activeProvider;
		const config = this.settings.providers[providerType];
		if (config?.enabled) {
			this.provider = createServerProvider(config);
		} else {
			this.provider = null;
		}
	}

	getActiveProvider(): ServerProvider | null {
		return this.provider;
	}

	getActiveProviderType(): ServerProviderType {
		return this.settings.activeProvider;
	}

	/** Provider instance for a specific type (e.g. deleting a note shared elsewhere). */
	getProviderFor(type: ServerProviderType): ServerProvider | null {
		const config = this.settings.providers[type];
		return config?.enabled ? createServerProvider(config) : null;
	}

	async testConnection(): Promise<boolean> {
		if (!this.provider) {
			return false;
		}
		return this.provider.testConnection();
	}

	async shareNote(
		file: TFile,
		content: string,
		title: string,
		app: App,
		reuseShortId?: string,
		options: ShareOptions = {}
	): Promise<ShareResult> {
		if (!this.provider) {
			return { success: false, error: 'No server provider configured' };
		}

		try {
			const shortId = reuseShortId || generateShortId(8);
			// The share modal's toggle wins; settings/frontmatter are the fallback.
			const shouldEncrypt = options.encrypted ?? this.shouldEncrypt(file, app);

			const extractedContent = await this.extractRenderedContent(app, file);
			let htmlContent = extractedContent || await this.renderMarkdown(content, file, app);

			// Assets are uploaded before encryption so encrypted notes keep working
			// images. Asset URLs are content-hashed and unlisted, but they are NOT
			// covered by the E2E encryption.
			htmlContent = await this.uploadInlineAssets(htmlContent, file, app);

			let finalEncryptedData: string | undefined;
			let encryptionKey: string | undefined;
			if (shouldEncrypt) {
				const encrypted = await encryptString(JSON.stringify({ content: htmlContent, title }));
				finalEncryptedData = JSON.stringify({ ciphertext: encrypted.ciphertext });
				encryptionKey = encrypted.key;
			}

			const description = this.extractDescription(content);
			const filename = `${shortId}.html`;
			const publicUrl = this.provider.getPublicUrl(filename);

			const html = generateNoteHtml({
				title,
				content: shouldEncrypt ? '' : htmlContent,
				url: publicUrl,
				lang: detectLang(shouldEncrypt ? title : `${title} ${content.slice(0, 2000)}`),
				cssUrl: await this.uploadCss(),
				noteWidth: this.settings.noteWidth,
				encrypted: shouldEncrypt,
				encryptedData: shouldEncrypt ? finalEncryptedData : undefined,
				description: shouldEncrypt ? undefined : description,
				// link/tag names would leak metadata on encrypted shares — skip there
				graph: shouldEncrypt ? undefined : this.collectGraphData(file, title, app),
			});

			const meta: ShareMeta = {
				shortId,
				title,
				encrypted: shouldEncrypt,
				expiresAt: options.expiresAt,
				vaultId: this.settings.vaultId,
			};

			const result = await this.provider.upload(html, filename, 'text/html', meta);

			if (!result.success) {
				return { success: false, error: result.error };
			}

			let url = result.url || publicUrl;
			if (shouldEncrypt && encryptionKey) {
				url = `${url}#${encryptionKey}`;
			}

			return {
				success: true,
				url,
				shortId,
				encrypted: shouldEncrypt,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	private async uploadInlineAssets(html: string, sourceFile: TFile, app: App): Promise<string> {
		if (!this.provider) return html;

		const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/g;
		const matches = Array.from(html.matchAll(imgRegex));
		if (matches.length === 0) return html;

		const replacements = new Map<string, string>();

		for (const match of matches) {
			const src = match[1];
			if (replacements.has(src)) continue;
			if (/^(https?:|data:|\/\/)/.test(src)) continue;

			const resolved = app.metadataCache.getFirstLinkpathDest(decodeURIComponent(src), sourceFile.path);
			if (!resolved) continue;

			try {
				const buffer = await app.vault.readBinary(resolved);
				const ext = resolved.extension.toLowerCase();
				const mime = ASSET_MIME[ext] || 'application/octet-stream';
				const url = await this.uploadAssetBuffer(buffer, ext, mime);
				if (url) replacements.set(src, url);
			} catch {
				// skip — broken link
			}
		}

		if (replacements.size === 0) return html;

		return html.replace(imgRegex, (full, src) => {
			const replaced = replacements.get(src);
			return replaced ? full.replace(src, replaced) : full;
		});
	}

	private async uploadAssetBuffer(buffer: ArrayBuffer, ext: string, mime: string): Promise<string | null> {
		if (!this.provider) return null;
		try {
			const hash = await sha1(buffer);
			const filename = `assets/${hash}.${ext}`;
			const result = await this.provider.uploadBinary(buffer, filename, mime);
			return result.success ? (result.url || this.provider.getPublicUrl(filename)) : null;
		} catch {
			return null;
		}
	}

	/** Deletes via the provider the note was actually shared to, not the active one. */
	async deleteNote(note: SharedNote): Promise<boolean> {
		const provider =
			note.provider === this.settings.activeProvider
				? this.provider
				: this.getProviderFor(note.provider);
		if (!provider) return false;

		try {
			const result = await provider.delete(`${note.shortId}.html`);
			return result.success;
		} catch {
			return false;
		}
	}

	/** Server-side share registry, if the active provider supports it. */
	async listRemoteNotes(): Promise<RemoteNoteMeta[] | null> {
		if (!this.provider?.list) return null;
		try {
			return await this.provider.list(this.settings.vaultId);
		} catch {
			return null;
		}
	}

	async revokeNote(shortId: string, revoked: boolean): Promise<boolean> {
		if (!this.provider?.revoke) return false;
		try {
			const result = await this.provider.revoke(shortId, revoked);
			return result.success;
		} catch {
			return false;
		}
	}

	private async uploadCss(): Promise<string | undefined> {
		if (!this.settings.includeTheme || !this.provider) {
			return undefined;
		}

		try {
			const css = this.extractCss();
			if (!css) {
				return undefined;
			}

			const cssHash = await sha1(css);
			const filename = `css/${cssHash}.css`;
			const result = await this.provider.upload(css, filename, 'text/css');

			return result.success ? result.url || this.provider.getPublicUrl(filename) : undefined;
		} catch {
			return undefined;
		}
	}

	private extractCss(): string {
		const SELECTOR_WHITELIST = [
			'.markdown-preview-view', '.markdown-rendered',
			'.callout', '.cm-callout', '.internal-link', '.external-link', '.tag',
			'.cm-strong', '.cm-em', '.cm-link', 'pre', 'code', 'blockquote',
			'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'th', 'td', 'img',
			'a', 'p', 'ul', 'ol', 'li', 'hr', 'mark', 'del',
		];
		const matchesWhitelist = (selector: string): boolean => {
			return SELECTOR_WHITELIST.some(w => selector.includes(w));
		};

		try {
			const rules: string[] = [];
			Array.from(document.styleSheets).forEach(sheet => {
				try {
					Array.from(sheet.cssRules).forEach(rule => {
						const text = rule.cssText;
						if (text.includes('@media print')) return;
						if (rule instanceof CSSStyleRule) {
							if (matchesWhitelist(rule.selectorText)) rules.push(text);
						} else if (rule.constructor.name === 'CSSMediaRule' || rule.constructor.name === 'CSSSupportsRule') {
							rules.push(text);
						}
					});
				} catch {
					// Cross-origin stylesheet, skip
				}
			});
			return rules.join('').replace(/\n/g, '');
		} catch {
			return '';
		}
	}

	/**
	 * Strip decorations other plugins inject into rendered markdown — SNW
	 * reference counters, copy buttons, frontmatter tables. Markdown
	 * post-processors run inside MarkdownRenderer too, so BOTH content
	 * paths need this.
	 */
	private cleanupRenderedDom(root: HTMLElement): void {
		if (this.settings.removeBacklinks) {
			root.querySelectorAll('.backlinks, .embedded-backlinks').forEach(el => el.remove());
		}
		root.querySelectorAll(
			'[class*="snw-"], [data-snw-type], button, .metadata-container, .frontmatter, .frontmatter-container, .mod-frontmatter'
		).forEach(el => el.remove());
	}

	private async extractRenderedContent(app: App, file: TFile): Promise<string | null> {
		try {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			// the active preview may belong to a different note (file-menu / CMS re-share)
			if (!view || view.file?.path !== file.path) {
				return null;
			}

			const previewEl = view.contentEl.querySelector('.markdown-preview-view');
			if (!previewEl) {
				return null;
			}

			const clone = previewEl.cloneNode(true) as HTMLElement;

			this.cleanupRenderedDom(clone);

			clone.querySelectorAll('[data-callout]').forEach(el => {
				const calloutType = el.getAttribute('data-callout');
				if (calloutType) {
					el.classList.add(`callout-${calloutType}`);
				}
			});

			const html = clone.innerHTML;
			const textContent = clone.textContent?.trim() || '';
			if (!textContent || textContent.length < 10) {
				return null;
			}

			return html;
		} catch {
			return null;
		}
	}

	private shouldEncrypt(file: TFile, app: App): boolean {
		if (this.settings.encryptionMode === 'always') return true;
		if (this.settings.encryptionMode === 'never') return false;

		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		const flag = fm?.[this.settings.encryptedField];
		if (flag === true) return true;
		if (flag === false) return false;
		return false;
	}

	/**
	 * Fallback when no live Reading-view DOM is available: render through
	 * Obsidian's own pipeline so tables, callouts, and embeds match the app.
	 */
	private async renderMarkdown(content: string, file: TFile, app: App): Promise<string> {
		let text = content;
		if (this.settings.removeFrontmatter) {
			text = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
		}

		const el = document.createElement('div');
		const component = new Component();
		component.load();
		try {
			await MarkdownRenderer.render(app, text, el, file.path, component);
			this.cleanupRenderedDom(el);
			el.querySelectorAll('[data-callout]').forEach(node => {
				const calloutType = node.getAttribute('data-callout');
				if (calloutType) {
					node.classList.add(`callout-${calloutType}`);
				}
			});
			return el.innerHTML;
		} finally {
			component.unload();
		}
	}

	/** Outgoing wiki-links + tags for the share page's local-graph panel. */
	private collectGraphData(file: TFile, title: string, app: App): { title: string; links: string[]; tags: string[] } | undefined {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache) return undefined;

		const links = [...new Set(
			(cache.links || [])
				.map(l => l.link.split('#')[0].split('|')[0].trim())
				.filter(Boolean)
				.map(l => l.split('/').pop() || l)
		)].slice(0, 20);

		const tags = [...new Set(
			(getAllTags(cache) || []).map(t => t.replace(/^#/, ''))
		)].slice(0, 15);

		if (links.length === 0 && tags.length === 0) return undefined;
		return { title, links, tags };
	}

	private extractDescription(content: string): string {
		const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
		const paragraphs = withoutFrontmatter.split('\n\n')
			.filter(p => p.trim() && !p.startsWith('#') && !p.startsWith('```'));
		const desc = paragraphs.slice(0, 2).join(' ').replace(/\n/g, ' ').trim();
		return desc.length > 200 ? desc.slice(0, 197) + '...' : desc;
	}
}

/** Hangul ratio over the sampled text decides the page language. */
function detectLang(sample: string): 'ko' | 'en' {
	const letters = sample.replace(/[^A-Za-z가-힣]/g, '');
	if (letters.length === 0) return 'en';
	const hangul = (letters.match(/[가-힣]/g) || []).length;
	return hangul / letters.length > 0.05 ? 'ko' : 'en';
}
