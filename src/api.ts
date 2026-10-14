import { TFile, MarkdownView, App, Component, MarkdownRenderer, getAllTags, setIcon, requestUrl } from 'obsidian';
import { CMDSShareSettings, SharedNote, ShareResult, ShareKind, ServerProviderType, NoteGraphData, NoteTemplateData, ThemePalette } from './types';
import { createServerProvider, ServerProvider, ShareMeta, RemoteNoteMeta, GitHubProvider, GitHubSetupResult } from './providers';
import { encryptString, generateShortId, sha1 } from './crypto';
import { generateNoteHtml, PALETTES } from './template';
import { detectShareKind, renderBase, renderCanvas, renderExcalidraw } from './renderers';
import { ThemeSnapshotStore, currentThemeName, extractObsidianPalette } from './theme-snapshot';

const ASSET_MIME: Record<string, string> = {
	png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
	gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
	avif: 'image/avif', bmp: 'image/bmp',
};

// Obsidian's built-in callout-type → lucide icon map
const CALLOUT_ICONS: Record<string, string> = {
	note: 'lucide-pencil',
	abstract: 'lucide-clipboard-list', summary: 'lucide-clipboard-list', tldr: 'lucide-clipboard-list',
	info: 'lucide-info',
	todo: 'lucide-check-circle-2',
	tip: 'lucide-flame', hint: 'lucide-flame', important: 'lucide-flame',
	success: 'lucide-check', check: 'lucide-check', done: 'lucide-check',
	question: 'lucide-help-circle', help: 'lucide-help-circle', faq: 'lucide-help-circle',
	warning: 'lucide-alert-triangle', caution: 'lucide-alert-triangle', attention: 'lucide-alert-triangle',
	failure: 'lucide-x', fail: 'lucide-x', missing: 'lucide-x',
	danger: 'lucide-zap', error: 'lucide-zap',
	bug: 'lucide-bug',
	example: 'lucide-list',
	quote: 'lucide-quote', cite: 'lucide-quote',
};

export interface ShareOptions {
	encrypted?: boolean;
	expiresAt?: number;
	/** Bases only: indexes of the views to publish (all when omitted). */
	baseViews?: number[];
}

export class ShareApiService {
	private settings: CMDSShareSettings;
	private provider: ServerProvider | null = null;

	constructor(settings: CMDSShareSettings, private themeStore?: ThemeSnapshotStore) {
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

	/** After a GitHub share: resolve when the Pages build that includes it is live. */
	waitForGitHubPages(since: number): Promise<boolean> {
		return new GitHubProvider(this.settings.providers.github).waitUntilLive(since);
	}

	/** One-click GitHub Pages onboarding (creates repo + enables Pages). */
	async setupGitHub(): Promise<GitHubSetupResult> {
		const gh = new GitHubProvider(this.settings.providers.github);
		return gh.setup();
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

			const kind = detectShareKind(file, app) ?? 'note';
			const rendered = await this.renderByKind(kind, file, content, app, options.baseViews);
			let htmlContent = rendered.html;

			// Assets are uploaded before encryption so encrypted notes keep working
			// images. Asset URLs are content-hashed and unlisted, but they are NOT
			// covered by the E2E encryption.
			htmlContent = await this.uploadInlineAssets(htmlContent, file, app);
			htmlContent = await this.externalizeDataFonts(htmlContent);

			// Raw markdown travels with the page so viewers can copy/download the
			// source. Honors removeFrontmatter — frontmatter may hold private keys.
			// Drawings/canvases/bases have no meaningful markdown source.
			let mdSource: string | undefined;
			if (kind === 'note') {
				mdSource = content;
				if (this.settings.removeFrontmatter) {
					mdSource = mdSource.replace(/^---\n[\s\S]*?\n---\n?/, '');
				}
			}

			const showTitle = this.settings.showTitleHeading
				&& !(kind === 'note' && this.settings.skipTitleHeadingIfH1 && startsWithH1(content));

			let finalEncryptedData: string | undefined;
			let encryptionKey: string | undefined;
			if (shouldEncrypt) {
				const encrypted = await encryptString(JSON.stringify({ content: htmlContent, title, markdown: mdSource }));
				finalEncryptedData = JSON.stringify({ ciphertext: encrypted.ciphertext });
				encryptionKey = encrypted.key;
			}

			const description = rendered.description ?? this.extractDescription(content);
			const filename = `${shortId}.html`;
			const publicUrl = this.provider.getPublicUrl(filename);

			const html = generateNoteHtml({
				title,
				showTitle,
				kind,
				layout: kind === 'note' ? 'note' : 'wide',
				...await this.resolveTheme(app),
				colorMode: this.settings.shareColorMode,
				footerLink: this.footerLink(),
				content: shouldEncrypt ? '' : htmlContent,
				url: publicUrl,
				lang: detectLang(shouldEncrypt || kind !== 'note' ? `${title} ${description}` : `${title} ${content.slice(0, 2000)}`),
				noteWidth: this.settings.noteWidth,
				encrypted: shouldEncrypt,
				encryptedData: shouldEncrypt ? finalEncryptedData : undefined,
				description: shouldEncrypt ? undefined : description,
				// link/tag names would leak metadata on encrypted shares — skip there
				graph: shouldEncrypt || kind !== 'note' ? undefined : this.collectGraphData(file, title, app),
				// plaintext md would break E2E — encrypted shares carry it in the payload
				markdown: shouldEncrypt ? undefined : mdSource,
				expiresAt: options.expiresAt,
			});

			const meta: ShareMeta = {
				shortId,
				title,
				encrypted: shouldEncrypt,
				expiresAt: options.expiresAt,
				vaultId: this.settings.vaultId,
				kind,
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
				kind,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/** Body HTML (+ optional description) for each shareable file type. */
	private async renderByKind(
		kind: ShareKind,
		file: TFile,
		content: string,
		app: App,
		baseViews?: number[]
	): Promise<{ html: string; description?: string }> {
		if (kind === 'note') {
			const extracted = await this.extractRenderedContent(app, file);
			const html = extracted || await this.renderMarkdown(content, file, app);
			// mermaid renders async in Obsidian, so the serialized DOM loses the
			// source — re-inject it from the raw markdown; the share page renders
			// it client-side with the latest mermaid build
			return { html: injectMermaidSources(html, content) };
		}
		if (kind === 'excalidraw') {
			const el = await renderExcalidraw(file);
			return { html: el.outerHTML, description: '' };
		}

		const component = new Component();
		component.load();
		try {
			const { el, description } = kind === 'canvas'
				? await renderCanvas(app, file, component)
				: await renderBase(app, file, component, baseViews);
			this.cleanupRenderedDom(el);
			el.querySelectorAll('[data-callout]').forEach(node => {
				const calloutType = node.getAttribute('data-callout');
				if (calloutType) node.classList.add(`callout-${calloutType}`);
			});
			return { html: el.outerHTML, description };
		} finally {
			component.unload();
		}
	}

	/**
	 * Excalidraw inlines whole font files as data: URIs — a custom local font
	 * can be ~10 MB. Large fonts are uploaded once as content-hashed assets and
	 * referenced by URL; small subsets stay inline.
	 */
	private async externalizeDataFonts(html: string): Promise<string> {
		const fontRe = /url\((["']?)data:((?:font|application)\/[\w.+-]+)[^,]*?;base64,([A-Za-z0-9+/=\s]+)\1\)/g;
		const matches = Array.from(html.matchAll(fontRe)).filter(m => m[3].length > 64 * 1024);
		if (matches.length === 0) return html;

		const FONT_EXT: Record<string, string> = {
			'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf',
			'application/font-woff': 'woff', 'application/x-font-ttf': 'ttf', 'application/x-font-otf': 'otf',
		};
		const replacements = new Map<string, string>();
		for (const m of matches) {
			if (replacements.has(m[0])) continue;
			const mime = m[2].toLowerCase();
			const ext = FONT_EXT[mime] || 'woff2';
			try {
				const url = await this.uploadAssetBuffer(base64ToBuffer(m[3]), ext, mime.startsWith('font/') ? mime : `font/${ext}`);
				if (url) replacements.set(m[0], `url("${url}")`);
			} catch {
				// keep inline — heavier page, but the drawing still renders right
			}
		}
		let out = html;
		for (const [from, to] of replacements) out = out.split(from).join(to);
		return out;
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
			if (/^data:/.test(src)) continue;

			try {
				const asset = await this.readImageSource(src, sourceFile, app);
				if (!asset) continue;
				const mime = ASSET_MIME[asset.ext] || 'application/octet-stream';
				const url = await this.uploadAssetBuffer(asset.buffer, asset.ext, mime);
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

	/**
	 * Turn an <img src> into uploadable bytes. Covers the three embed styles:
	 * vault embeds (relative src), local absolute paths (file:// and Obsidian's
	 * app:// rewrite — e.g. Eagle .library files), and localhost URLs (Eagle's
	 * HTTP API). Public web URLs return null — they already work on the web.
	 */
	private async readImageSource(
		src: string,
		sourceFile: TFile,
		app: App
	): Promise<{ buffer: ArrayBuffer; ext: string } | null> {
		const extOf = (path: string): string => {
			const clean = path.split(/[?#]/)[0];
			const ext = (clean.split('.').pop() || '').toLowerCase();
			return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'png';
		};

		// localhost / loopback URLs (Eagle HTTP API etc.) — fetch and re-host
		if (/^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0)(:|\/)/i.test(src)) {
			const response = await requestUrl({ url: src, throw: false });
			if (response.status < 200 || response.status >= 300) return null;
			return { buffer: response.arrayBuffer, ext: extOf(src) };
		}

		// blob: URLs are in-memory renders (e.g. embedded Excalidraw drawings)
		if (/^blob:/.test(src)) {
			const blob = await (await fetch(src)).blob();
			const ext = Object.entries(ASSET_MIME).find(([, mime]) => mime === blob.type)?.[0] || 'png';
			return { buffer: await blob.arrayBuffer(), ext };
		}

		// public web URLs stay as-is
		if (/^(https?:)?\/\//.test(src)) return null;

		// absolute local paths: file:///… or Obsidian's app://<id>/… rewrite
		const localMatch = src.match(/^file:\/\/(.*)$/) || src.match(/^app:\/\/[^/]+(\/.*)$/);
		if (localMatch) {
			let path = decodeURIComponent(localMatch[1]);
			if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1); // windows drive
			const nodeRequire = (window as unknown as {
				require?: (m: string) => { readFileSync(p: string): Uint8Array; existsSync(p: string): boolean; readdirSync(p: string): string[] };
			}).require;
			if (!nodeRequire) return null; // mobile: no filesystem access
			const fs = nodeRequire('fs');
			path = upgradeEagleThumbnail(path, fs);
			const bytes = fs.readFileSync(path);
			return {
				buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
				ext: extOf(path),
			};
		}

		// vault-relative embed
		const resolved = app.metadataCache.getFirstLinkpathDest(decodeURIComponent(src), sourceFile.path);
		if (!(resolved instanceof TFile)) return null;
		return { buffer: await app.vault.readBinary(resolved), ext: resolved.extension.toLowerCase() };
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

	/**
	 * Full-look mode uploads the theme snapshot once per provider (content
	 * hashed, so earlier shares keep pointing at the CSS they were made with).
	 * Any failure falls back to the theme's colors on CMDS typography.
	 */
	private async resolveTheme(app: App): Promise<Pick<NoteTemplateData, 'palette' | 'themeName' | 'cssUrl' | 'nativeTheme'>> {
		if (this.settings.shareTheme === 'obsidian-native' && this.themeStore && this.provider) {
			try {
				const { meta, css } = await this.themeStore.ensure();
				const filename = `css/${meta.hash}.css`;
				const target = this.provider.getPublicUrl(filename);
				let cssUrl: string | undefined = meta.uploads[target];
				if (!cssUrl) {
					const result = await this.provider.upload(css, filename, 'text/css');
					if (result.success) {
						cssUrl = result.url || target;
						await this.themeStore.recordUpload(target, cssUrl);
					}
				}
				if (cssUrl) {
					return {
						palette: meta.palette,
						themeName: `${meta.name} (Obsidian)`,
						cssUrl,
						nativeTheme: { bodyClasses: meta.bodyClasses, bodyStyle: meta.bodyStyle },
					};
				}
			} catch {
				// fall through to colors only
			}
		}
		return { palette: this.resolvePalette(), themeName: this.themeDisplayName(app) };
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

		// Live checkbox state is a DOM property, not necessarily an HTML attribute.
		// Preserve it through serialization and make the shared snapshot read-only.
		root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(checkbox => {
			checkbox.toggleAttribute('checked', checkbox.checked);
			checkbox.setAttribute('disabled', '');
		});

		// virtual-scroll leftovers: the pusher spacer and the sizer's inline
		// min-height/padding would reserve phantom space on the share page
		root.querySelectorAll('.markdown-preview-pusher').forEach(el => el.remove());
		root.querySelectorAll('.markdown-preview-sizer').forEach(el => el.removeAttribute('style'));

		// pipe tables Obsidian left as plain paragraphs (e.g. a table that
		// interrupts a paragraph, or was mid-edit when rendered) → real <table>
		rescueRawTables(root);

		// callout icons paint asynchronously in Obsidian, so the cloned/rendered
		// DOM often carries an EMPTY <svg> — refill from the bundled icon set
		root.querySelectorAll('.callout').forEach(callout => {
			const iconEl = callout.querySelector<HTMLElement>('.callout-icon');
			if (!iconEl) return;
			const hasDrawnIcon = iconEl.querySelector('svg path, svg use, svg circle, svg rect, svg line, svg polyline, svg polygon');
			if (hasDrawnIcon) return;
			iconEl.empty();
			const type = (callout.getAttribute('data-callout') || 'note').toLowerCase();
			setIcon(iconEl, CALLOUT_ICONS[type] || 'lucide-pencil');
		});
	}

	private async extractRenderedContent(app: App, file: TFile): Promise<string | null> {
		try {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			// the active preview may belong to a different note (file-menu / CMS re-share)
			if (!view || view.file?.path !== file.path) {
				return null;
			}
			// In Live Preview / source mode the reading-view DOM still exists but is
			// hidden and STALE (last rendered content, possibly hours old). Cloning
			// it ships outdated markup — e.g. a table that has since been fixed
			// still appears as raw pipe text. Only trust a visible reading view.
			if (view.getMode() !== 'preview') {
				return null;
			}

			const previewEl = view.contentEl.querySelector('.markdown-preview-view');
			if (!previewEl) {
				return null;
			}

			// Reading view VIRTUALIZES long notes: sections scrolled out of sight
			// are removed from the DOM and replaced by spacer margins. Cloning
			// that DOM ships an incomplete note with a giant blank gap. Detect
			// the artifacts and fall back to a full MarkdownRenderer pass.
			const pusher = previewEl.querySelector<HTMLElement>('.markdown-preview-pusher');
			if (pusher && Math.abs(parseFloat(pusher.style.marginBottom || '0')) > 1) {
				return null; // content above the viewport is missing
			}
			const sizer = previewEl.querySelector<HTMLElement>('.markdown-preview-sizer');
			if (sizer) {
				const estimatedFull = parseFloat(sizer.style.minHeight || '0');
				let laidOut = 0;
				for (const child of Array.from(sizer.children)) laidOut += (child as HTMLElement).offsetHeight;
				if (estimatedFull > 0 && laidOut < estimatedFull * 0.8) {
					return null; // content below the viewport is missing
				}
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

		const el = createDiv();
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

	/**
	 * Local-graph data for the share page: the note, its direct neighbors
	 * (outgoing links, backlinks, tags), edges BETWEEN those neighbors, and a
	 * capped ring of second-degree notes — same shape as Obsidian's local graph.
	 */
	private footerLink(): { url: string; label: string } | undefined {
		const url = (this.settings.footerLinkUrl || '').trim();
		if (!url) return undefined;
		let label = (this.settings.footerLinkLabel || '').trim();
		if (!label) {
			try { label = new URL(url).host; } catch { label = url; }
		}
		return { url, label };
	}

	private themeDisplayName(app: App): string {
		const theme = this.settings.shareTheme || 'cmds';
		if (theme === 'obsidian' || theme === 'obsidian-native') return `${currentThemeName(app)} (Obsidian)`;
		return { cmds: 'CMDS', mono: 'Mono', sepia: 'Sepia', ocean: 'Ocean' }[theme] || 'CMDS';
	}

	private resolvePalette(): ThemePalette {
		const theme = this.settings.shareTheme || 'cmds';
		if (theme === 'obsidian' || theme === 'obsidian-native') {
			try {
				return extractObsidianPalette();
			} catch {
				return PALETTES.cmds;
			}
		}
		return PALETTES[theme as keyof typeof PALETTES] || PALETTES.cmds;
	}

	private collectGraphData(file: TFile, title: string, app: App): NoteGraphData | undefined {
		const MAX_L1 = 16;
		const MAX_NODES = 42;

		const mc = app.metadataCache;
		const resolved: Record<string, Record<string, number>> = mc.resolvedLinks;
		const basename = (path: string) => (path.split('/').pop() || path).replace(/\.md$/, '');

		const nodes: { id: string; label: string; type: 'note' | 'tag'; level: number }[] = [];
		const index = new Map<string, number>();
		const edgeSet = new Set<string>();
		const edges: [number, number][] = [];

		const addNode = (id: string, label: string, type: 'note' | 'tag', level: number): number => {
			const existing = index.get(id);
			if (existing !== undefined) return existing;
			if (nodes.length >= MAX_NODES) return -1;
			nodes.push({ id, label, type, level });
			index.set(id, nodes.length - 1);
			return nodes.length - 1;
		};
		const addEdge = (a: number, b: number) => {
			if (a < 0 || b < 0 || a === b) return;
			const key = a < b ? `${a}-${b}` : `${b}-${a}`;
			if (edgeSet.has(key)) return;
			edgeSet.add(key);
			edges.push([a, b]);
		};
		const tagsOf = (path: string): string[] => {
			const f = app.vault.getAbstractFileByPath(path);
			if (!(f instanceof TFile)) return [];
			const cache = mc.getFileCache(f);
			return cache ? (getAllTags(cache) || []).map(t => t.replace(/^#/, '')) : [];
		};

		const centerIdx = addNode(file.path, title, 'note', 0);

		// level 1: outgoing links, backlinks, tags
		const outgoing = Object.keys(resolved[file.path] || {});
		const backlinks: string[] = [];
		for (const src of Object.keys(resolved)) {
			if (src !== file.path && resolved[src]?.[file.path]) backlinks.push(src);
		}
		const l1Notes = [...new Set([...outgoing, ...backlinks])].slice(0, MAX_L1);
		for (const p of l1Notes) addEdge(centerIdx, addNode(p, basename(p), 'note', 1));
		for (const t of tagsOf(file.path).slice(0, 8)) addEdge(centerIdx, addNode(`#${t}`, `#${t}`, 'tag', 1));

		// unresolved outgoing links still show as leaf nodes
		const cache = mc.getFileCache(file);
		const unresolved = [...new Set(
			(cache?.links || [])
				.map(l => l.link.split('#')[0].split('|')[0].trim())
				.filter(l => l && !mc.getFirstLinkpathDest(l, file.path))
		)].slice(0, 6);
		for (const l of unresolved) addEdge(centerIdx, addNode(`?${l}`, l.split('/').pop() || l, 'note', 1));

		// level 2: neighbors' own links/tags — edges between existing nodes first,
		// then grow the ring while the node budget lasts
		for (const p of l1Notes) {
			const from = index.get(p);
			if (from === undefined) continue;
			for (const target of Object.keys(resolved[p] || {})) {
				if (target === file.path) continue;
				const existing = index.get(target);
				addEdge(from, existing !== undefined ? existing : addNode(target, basename(target), 'note', 2));
			}
			for (const t of tagsOf(p)) {
				const existing = index.get(`#${t}`);
				if (existing !== undefined) addEdge(from, existing);
			}
		}

		if (nodes.length <= 1) return undefined;
		return {
			title,
			nodes: nodes.map(n => ({ label: n.label, type: n.type, level: n.level })),
			edges,
		};
	}

	private extractDescription(content: string): string {
		const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
		const paragraphs = withoutFrontmatter.split('\n\n')
			.filter(p => p.trim() && !p.startsWith('#') && !p.startsWith('```'));
		const desc = paragraphs.slice(0, 2).join(' ').replace(/\n/g, ' ').trim();
		return desc.length > 200 ? desc.slice(0, 197) + '...' : desc;
	}
}

/** True when the first non-blank line after the frontmatter is an H1 ("# Title"). */
export function startsWithH1(markdown: string): boolean {
	const body = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
	const first = body.split('\n').find(line => line.trim().length > 0);
	return !!first && /^#[ \t]+\S/.test(first.trim());
}

function base64ToBuffer(b64: string): ArrayBuffer {
	const binary = atob(b64.replace(/\s+/g, ''));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes.buffer;
}

/** Hangul ratio over the sampled text decides the page language. */
function detectLang(sample: string): 'ko' | 'en' {
	const letters = sample.replace(/[^A-Za-z가-힣]/g, '');
	if (letters.length === 0) return 'en';
	const hangul = (letters.match(/[가-힣]/g) || []).length;
	return hangul / letters.length > 0.05 ? 'ko' : 'en';
}


// ═══ mermaid source re-injection ═══

function injectMermaidSources(html: string, markdown: string): string {
	const sources: string[] = [];
	const fence = /```mermaid[ \t]*\n([\s\S]*?)```/g;
	let m: RegExpExecArray | null;
	while ((m = fence.exec(markdown)) !== null) sources.push(m[1].trimEnd());
	if (sources.length === 0) return html;

	const root = new DOMParser().parseFromString(html, 'text/html').body;

	// candidates in document order, covering both render paths
	const candidates: Element[] = [];
	root.querySelectorAll('.block-language-mermaid, div.mermaid, pre').forEach(el => {
		if (el.tagName === 'PRE') {
			const code = el.querySelector('code');
			if (!code || !/language-mermaid/.test(code.className) && !/language-mermaid/.test(el.className)) return;
		}
		if (el.parentElement?.closest('.block-language-mermaid')) return; // avoid nested double-count
		candidates.push(el);
	});

	const n = Math.min(candidates.length, sources.length);
	for (let i = 0; i < n; i++) {
		const holder = createDiv();
		holder.className = 'mermaid-container';
		holder.setAttribute('data-mmd', textToBase64(sources[i]));
		candidates[i].replaceWith(holder);
	}
	return root.innerHTML;
}

/**
 * Obsidian occasionally leaves a GFM pipe table unparsed — it lands as a
 * <p> whose lines are the raw `| a | b |` rows joined by <br>. Rebuild those
 * into a real table (inline HTML inside cells is kept as Obsidian rendered it).
 */
const TABLE_SEP_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;

type CellNodes = Node[];

/** Split one rendered line (nodes between <br>s) into cells at unescaped `|`
 *  characters found in text nodes. Inline elements (<code>, <strong>…) are
 *  kept whole, so a pipe inside <code> never splits a cell. */
function splitLineIntoCells(line: Node[]): CellNodes[] {
	const cells: CellNodes[] = [[]];
	const push = (n: Node) => cells[cells.length - 1].push(n);
	for (const node of line) {
		if (node.nodeType !== Node.TEXT_NODE) { push(node.cloneNode(true)); continue; }
		const text = node.textContent || '';
		let buf = '';
		for (let i = 0; i < text.length; i++) {
			const ch = text[i];
			if (ch === '\\' && text[i + 1] === '|') { buf += '|'; i++; continue; }
			if (ch === '|') { if (buf) push(document.createTextNode(buf)); buf = ''; cells.push([]); continue; }
			buf += ch;
		}
		if (buf) push(document.createTextNode(buf));
	}
	// trim whitespace-only edge text and drop the empty cells produced by the
	// leading/trailing pipes of `| a | b |`
	const trimmed = cells.map(c => {
		const first = c[0], last = c[c.length - 1];
		if (first?.nodeType === Node.TEXT_NODE) first.textContent = (first.textContent || '').replace(/^\s+/, '');
		if (last?.nodeType === Node.TEXT_NODE) last.textContent = (last.textContent || '').replace(/\s+$/, '');
		return c.filter(n => n.nodeType !== Node.TEXT_NODE || (n.textContent || '').length > 0);
	});
	if (trimmed.length > 1 && trimmed[0].length === 0) trimmed.shift();
	if (trimmed.length > 1 && trimmed[trimmed.length - 1].length === 0) trimmed.pop();
	return trimmed;
}

function lineText(line: Node[]): string {
	return line.map(n => n.textContent || '').join('').trim();
}

/**
 * Obsidian occasionally leaves a GFM pipe table unparsed — it lands as a
 * <p> whose lines are the raw `| a | b |` rows joined by <br>. Rebuild those
 * into a real table by moving the already-rendered inline nodes into cells
 * (no HTML string round-trip).
 */
function rescueRawTables(root: HTMLElement): void {
	root.querySelectorAll('p').forEach(p => {
		if (!/^\s*\|/.test(p.textContent || '')) return;
		const lines: Node[][] = [[]];
		p.childNodes.forEach(n => {
			if (n instanceof HTMLBRElement) lines.push([]);
			else lines[lines.length - 1].push(n);
		});
		const rows = lines.filter(l => lineText(l).length > 0);
		if (rows.length < 2) return;
		const sepText = lineText(rows[1]);
		if (!lineText(rows[0]).startsWith('|') || !TABLE_SEP_RE.test(sepText)) return;

		const aligns = sepText.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => {
			const t = c.trim();
			const l = t.startsWith(':'), r = t.endsWith(':');
			return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
		});
		const header = splitLineIntoCells(rows[0]);
		const body: CellNodes[][] = [];
		let i = 2;
		for (; i < rows.length; i++) {
			if (!lineText(rows[i]).startsWith('|')) break;
			body.push(splitLineIntoCells(rows[i]));
		}
		const rest = rows.slice(i);

		const table = createEl('table');
		const hr = table.createTHead().insertRow();
		header.forEach((cell, k) => {
			const th = hr.createEl('th');
			if (aligns[k]) th.setCssStyles({ textAlign: aligns[k] });
			cell.forEach(n => th.appendChild(n));
		});
		const tbody = table.createTBody();
		body.forEach(r => {
			const tr = tbody.insertRow();
			header.forEach((_, k) => {
				const td = tr.insertCell();
				if (aligns[k]) td.setCssStyles({ textAlign: aligns[k] });
				(r[k] || []).forEach(n => td.appendChild(n));
			});
		});

		p.replaceWith(table);
		if (rest.length) {
			const tail = createEl('p');
			rest.forEach((line, idx) => {
				if (idx > 0) tail.createEl('br');
				line.forEach(n => tail.appendChild(n));
			});
			table.after(tail);
		}
	});
}

function textToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}


/**
 * Eagle embeds usually point at the small `…_thumbnail.png` inside an
 * `<id>.info` folder — the untouched original always sits next to it.
 * Swap the path to the original when it exists.
 */
function upgradeEagleThumbnail(
	path: string,
	fs: { existsSync(p: string): boolean; readdirSync(p: string): string[] }
): string {
	const m = path.match(/^(.*)_thumbnail(\.[A-Za-z0-9]+)$/);
	if (!m) return path;
	try {
		const direct = m[1] + m[2];
		if (fs.existsSync(direct)) return direct;
		// original may use a different extension — scan the .info folder
		const slash = path.lastIndexOf('/');
		const dir = path.slice(0, slash);
		if (!dir.endsWith('.info')) return path;
		const original = fs.readdirSync(dir).find(name =>
			!/_thumbnail\./.test(name) &&
			name !== 'metadata.json' &&
			/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(name)
		);
		return original ? `${dir}/${original}` : path;
	} catch {
		return path;
	}
}
