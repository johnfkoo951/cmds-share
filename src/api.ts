import { TFile, MarkdownView, App, Component, MarkdownRenderer, getAllTags, setIcon, requestUrl } from 'obsidian';
import { CMDSShareSettings, SharedNote, ShareResult, ServerProviderType, NoteGraphData, ThemePalette, ThemeVars } from './types';
import { createServerProvider, ServerProvider, ShareMeta, RemoteNoteMeta } from './providers';
import { encryptString, generateShortId, sha1 } from './crypto';
import { generateNoteHtml, PALETTES } from './template';

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

			// mermaid renders async in Obsidian, so the serialized DOM loses the
			// source — re-inject it from the raw markdown; the share page renders
			// it client-side with the latest mermaid build
			htmlContent = injectMermaidSources(htmlContent, content);

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
				palette: this.resolvePalette(),
				themeName: this.themeDisplayName(app),
				footerLink: this.footerLink(),
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

		// public web URLs stay as-is
		if (/^(https?:)?\/\//.test(src)) return null;

		// absolute local paths: file:///… or Obsidian's app://<id>/… rewrite
		const localMatch = src.match(/^file:\/\/(.*)$/) || src.match(/^app:\/\/[^/]+(\/.*)$/);
		if (localMatch) {
			let path = decodeURIComponent(localMatch[1]);
			if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1); // windows drive
			const nodeRequire = (window as unknown as { require?: (m: string) => { readFileSync(p: string): Uint8Array } }).require;
			if (!nodeRequire) return null; // mobile: no filesystem access
			const bytes = nodeRequire('fs').readFileSync(path);
			return {
				buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
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

		// callout icons paint asynchronously in Obsidian, so the cloned/rendered
		// DOM often carries an EMPTY <svg> — refill from the bundled icon set
		root.querySelectorAll('.callout').forEach(callout => {
			const iconEl = callout.querySelector('.callout-icon') as HTMLElement | null;
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
		if (theme === 'obsidian') {
			const custom = (app as unknown as { customCss?: { theme?: string } }).customCss?.theme;
			return custom ? `${custom} (Obsidian)` : 'Obsidian';
		}
		return { cmds: 'CMDS', mono: 'Mono', sepia: 'Sepia', ocean: 'Ocean' }[theme] || 'CMDS';
	}

	private resolvePalette(): ThemePalette {
		const theme = this.settings.shareTheme || 'cmds';
		if (theme === 'obsidian') {
			try {
				return extractObsidianPalette();
			} catch {
				return PALETTES.cmds;
			}
		}
		return PALETTES[theme] || PALETTES.cmds;
	}

	private collectGraphData(file: TFile, title: string, app: App): NoteGraphData | undefined {
		const MAX_L1 = 16;
		const MAX_NODES = 42;

		const mc = app.metadataCache;
		const resolved = mc.resolvedLinks as Record<string, Record<string, number>>;
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

/** Hangul ratio over the sampled text decides the page language. */
function detectLang(sample: string): 'ko' | 'en' {
	const letters = sample.replace(/[^A-Za-z가-힣]/g, '');
	if (letters.length === 0) return 'en';
	const hangul = (letters.match(/[가-힣]/g) || []).length;
	return hangul / letters.length > 0.05 ? 'ko' : 'en';
}


// ═══ "Follow my Obsidian theme" palette extraction ═══
// A probe element carrying .theme-light / .theme-dark picks up the theme's CSS
// custom properties (rules are class-scoped, not body-scoped, in most themes),
// and getComputedStyle resolves var() chains for us.

const OBSIDIAN_VARS = [
	'--background-primary',
	'--background-primary-alt',
	'--background-secondary',
	'--text-normal',
	'--text-muted',
	'--text-accent',
	'--text-accent-hover',
	'--background-modifier-border',
	'--code-background',
] as const;

function normalizeCssValue(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

function readVars(el: Element): Record<string, string> {
	const computed = getComputedStyle(el);
	const out: Record<string, string> = {};
	for (const name of OBSIDIAN_VARS) {
		const value = normalizeCssValue(computed.getPropertyValue(name));
		if (value) out[name] = value;
	}
	return out;
}

/** Best-effort read of the NON-active mode via a probe carrying the theme class.
 * Themes that scope vars to body.theme-* defeat this — callers must sanity-check. */
function probeThemeVars(mode: 'theme-light' | 'theme-dark'): Record<string, string> {
	const probe = document.body.createDiv({ cls: mode });
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	try {
		return readVars(probe);
	} finally {
		probe.remove();
	}
}

function luminance(color: string): number {
	// crude but sufficient: parse #rgb/#rrggbb or rgb()
	let r = 0, g = 0, b = 0;
	const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	const rgb = color.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
	if (hex) {
		let h = hex[1];
		if (h.length === 3) h = h.split('').map(c => c + c).join('');
		r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
	} else if (rgb) {
		r = Number(rgb[1]); g = Number(rgb[2]); b = Number(rgb[3]);
	} else {
		return 0.5;
	}
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function toVars(v: Record<string, string>, fallback: ThemeVars): ThemeVars {
	const accent = v['--text-accent'] || fallback.accent;
	return {
		text: v['--text-normal'] || fallback.text,
		muted: v['--text-muted'] || fallback.muted,
		bg: v['--background-primary'] || fallback.bg,
		accent,
		accentLight: v['--text-accent-hover'] || accent,
		accentOn: luminance(accent) > 0.55 ? '#111' : '#fff',
		border: v['--background-modifier-border'] || fallback.border,
		codeBg: v['--background-secondary'] || fallback.codeBg,
		cardBg: v['--background-primary-alt'] || v['--background-secondary'] || fallback.cardBg,
		preBg: v['--code-background'] || v['--background-secondary'] || fallback.preBg,
		preFg: v['--text-normal'] || fallback.preFg,
		graphNote: accent,
	};
}

function extractObsidianPalette(): ThemePalette {
	const isDark = document.body.classList.contains('theme-dark');
	// the ACTIVE mode reads exactly from live computed styles
	const active = toVars(readVars(document.body), isDark ? PALETTES.cmds.dark : PALETTES.cmds.light);
	// the other mode comes from a class probe — reject implausible results
	const probed = toVars(
		probeThemeVars(isDark ? 'theme-light' : 'theme-dark'),
		isDark ? PALETTES.cmds.light : PALETTES.cmds.dark
	);
	const plausible = (vars: ThemeVars, mode: 'light' | 'dark'): ThemeVars => {
		const lum = luminance(vars.bg);
		const ok = mode === 'light' ? lum > 0.5 : lum < 0.5;
		return ok ? vars : PALETTES.cmds[mode];
	};
	return isDark
		? { light: plausible(probed, 'light'), dark: plausible(active, 'dark') }
		: { light: plausible(active, 'light'), dark: plausible(probed, 'dark') };
}


// ═══ mermaid source re-injection ═══

function injectMermaidSources(html: string, markdown: string): string {
	const sources: string[] = [];
	const fence = /```mermaid[ \t]*\n([\s\S]*?)```/g;
	let m: RegExpExecArray | null;
	while ((m = fence.exec(markdown)) !== null) sources.push(m[1].trimEnd());
	if (sources.length === 0) return html;

	const root = document.createElement('div');
	root.innerHTML = html;

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
		const holder = document.createElement('div');
		holder.className = 'mermaid-container';
		holder.setAttribute('data-mmd', textToBase64(sources[i]));
		candidates[i].replaceWith(holder);
	}
	return root.innerHTML;
}

function textToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}
