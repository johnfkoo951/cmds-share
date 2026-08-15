import { TFile, MarkdownView, App } from 'obsidian';
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

			const extractedContent = await this.extractRenderedContent(app);
			let htmlContent = extractedContent || this.markdownToHtml(content);

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

	private async extractRenderedContent(app: App): Promise<string | null> {
		try {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				return null;
			}

			const previewEl = view.contentEl.querySelector('.markdown-preview-view');
			if (!previewEl) {
				return null;
			}

			const clone = previewEl.cloneNode(true) as HTMLElement;

			if (this.settings.removeBacklinks) {
				clone.querySelectorAll('.backlinks').forEach(el => el.remove());
			}

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

	private markdownToHtml(markdown: string): string {
		let text = markdown;

		if (this.settings.removeFrontmatter) {
			text = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
		}

		const lines = text.split('\n');
		const htmlLines: string[] = [];
		let inCodeBlock = false;
		let inList = false;
		let listType: 'ul' | 'ol' = 'ul';

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			if (line.startsWith('```')) {
				if (inCodeBlock) {
					htmlLines.push('</code></pre>');
					inCodeBlock = false;
				} else {
					const lang = line.slice(3).trim();
					htmlLines.push(`<pre><code class="language-${lang || 'text'}">`);
					inCodeBlock = true;
				}
				continue;
			}

			if (inCodeBlock) {
				htmlLines.push(this.escapeForHtml(line));
				continue;
			}

			if (inList && !line.match(/^(\s*[-*+]|\s*\d+\.)\s/)) {
				htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
				inList = false;
			}

			const h6 = line.match(/^######\s+(.*)/);
			if (h6) { htmlLines.push(`<h6>${this.inlineMarkdown(h6[1])}</h6>`); continue; }
			const h5 = line.match(/^#####\s+(.*)/);
			if (h5) { htmlLines.push(`<h5>${this.inlineMarkdown(h5[1])}</h5>`); continue; }
			const h4 = line.match(/^####\s+(.*)/);
			if (h4) { htmlLines.push(`<h4>${this.inlineMarkdown(h4[1])}</h4>`); continue; }
			const h3 = line.match(/^###\s+(.*)/);
			if (h3) { htmlLines.push(`<h3>${this.inlineMarkdown(h3[1])}</h3>`); continue; }
			const h2 = line.match(/^##\s+(.*)/);
			if (h2) { htmlLines.push(`<h2>${this.inlineMarkdown(h2[1])}</h2>`); continue; }
			const h1 = line.match(/^#\s+(.*)/);
			if (h1) { htmlLines.push(`<h1>${this.inlineMarkdown(h1[1])}</h1>`); continue; }

			if (line.match(/^>\s?\[!(\w+)\]/)) {
				const calloutMatch = line.match(/^>\s?\[!(\w+)\]\s*(.*)/);
				if (calloutMatch) {
					const calloutType = calloutMatch[1];
					const calloutTitle = calloutMatch[2] || calloutType;
					const calloutLines = [`<div class="callout callout-${calloutType}">`, `<div class="callout-title">${this.inlineMarkdown(calloutTitle)}</div>`, '<div class="callout-content">'];
					let j = i + 1;
					while (j < lines.length && lines[j].startsWith('>')) {
						calloutLines.push(`<p>${this.inlineMarkdown(lines[j].replace(/^>\s?/, ''))}</p>`);
						j++;
					}
					calloutLines.push('</div></div>');
					htmlLines.push(calloutLines.join('\n'));
					i = j - 1;
					continue;
				}
			}

			if (line.startsWith('>')) {
				const quoteLines = [line.replace(/^>\s?/, '')];
				let j = i + 1;
				while (j < lines.length && lines[j].startsWith('>')) {
					quoteLines.push(lines[j].replace(/^>\s?/, ''));
					j++;
				}
				htmlLines.push(`<blockquote>${quoteLines.map(l => `<p>${this.inlineMarkdown(l)}</p>`).join('\n')}</blockquote>`);
				i = j - 1;
				continue;
			}

			if (line.match(/^[-*+]\s/)) {
				if (!inList) {
					htmlLines.push('<ul>');
					inList = true;
					listType = 'ul';
				}
				htmlLines.push(`<li>${this.inlineMarkdown(line.replace(/^[-*+]\s/, ''))}</li>`);
				continue;
			}

			if (line.match(/^\d+\.\s/)) {
				if (!inList) {
					htmlLines.push('<ol>');
					inList = true;
					listType = 'ol';
				}
				htmlLines.push(`<li>${this.inlineMarkdown(line.replace(/^\d+\.\s/, ''))}</li>`);
				continue;
			}

			if (line.match(/^---$|^\*\*\*$|^___$/)) {
				htmlLines.push('<hr>');
				continue;
			}

			if (line.trim() === '') {
				htmlLines.push('');
				continue;
			}

			htmlLines.push(`<p>${this.inlineMarkdown(line)}</p>`);
		}

		if (inList) {
			htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
		}
		if (inCodeBlock) {
			htmlLines.push('</code></pre>');
		}

		return htmlLines.join('\n');
	}

	private inlineMarkdown(text: string): string {
		let result = text;
		result = result.replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, path, alt) => {
			return `<img src="${path}" alt="${alt || path}">`;
		});
		result = result.replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, link, alias) => {
			return `<span class="internal-link">${alias || link}</span>`;
		});
		result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
		result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
		result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
		result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
		result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
		result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
		result = result.replace(/==(.+?)==/g, '<mark>$1</mark>');
		return result;
	}

	private escapeForHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
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
