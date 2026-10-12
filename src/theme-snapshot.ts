import { App, normalizePath } from 'obsidian';
import type { Plugin } from 'obsidian';
import { CMDSShareSettings, ThemePalette, ThemeSnapshot, ThemeVars } from './types';
import { sha1 } from './crypto';
import { PALETTES } from './template';

/**
 * "My Obsidian theme (full look)": a frozen copy of the CSS that makes notes
 * look the way they do in Obsidian — app.css, the community theme, enabled
 * snippets and Style Settings — plus the body classes / inline variables those
 * stylesheets key on. Like Share Note, the snapshot is taken once and reused,
 * so switching themes in Obsidian later does not restyle shared pages until
 * the user re-captures.
 */

const SNAPSHOT_FILE = 'theme-snapshot.css';

/**
 * Rules that only style the app chrome. A rule is dropped when EVERY selector
 * in its list needs one of these — on a share page those elements never
 * exist, so the rule could not match anyway; it is just weight.
 */
const CHROME_TOKENS = [
	'.workspace', '.modal', '.menu', '.setting', '.cm-', '.CodeMirror', '.HyperMD',
	'.nav-', '.suggestion', '.prompt', '.status-bar', '.titlebar', '.view-header',
	'.view-action', '.view-content', '.tree-item', '.vertical-tab', '.horizontal-tab',
	'.graph-', '.mobile-', '.sidebar', '.side-dock', '.mod-sidedock', '.mod-root',
	'.mod-left-split', '.mod-right-split', '.tooltip', '.notice', '.canvas', '.pdf-',
	'.community-', '.installed-plugins', '.plugin-', '.theme-list', '.hotkey',
	'.document-search', '.search-', '.tab-', '.ribbon', '.app-container', '.popover',
	'.markdown-source-view', '.metadata-', '.bases-', '.empty-state', '.file-explorer',
	'.drag-', '.dropdown', '.checkbox-container', '.slider', '.mod-cta', '.mod-stacked',
	'.starter', '.release-notes', '.vim-', '.progress-bar', '.clickable-icon', '.sync-',
	'.publish-', '.bookmark', '.outline', '.backlink', '.multi-select', '.color-picker',
	'.is-mobile', '.is-phone', '.is-tablet',
];

/** Body classes describing the window, not the theme. */
const VOLATILE_BODY_CLASS = /^(mod-|is-|theme-light$|theme-dark$|show-ribbon$|show-view-header$|auto-full-screen$)/;

export interface CapturedTheme {
	meta: ThemeSnapshot;
	css: string;
}

export class ThemeSnapshotStore {
	constructor(
		private app: App,
		private plugin: Plugin & { settings: CMDSShareSettings; saveSettings(): Promise<void> }
	) {}

	get meta(): ThemeSnapshot | null {
		return this.plugin.settings.themeSnapshot;
	}

	private get path(): string {
		return normalizePath(`${this.plugin.manifest.dir ?? ''}/${SNAPSHOT_FILE}`);
	}

	/** Freeze the current theme. Replaces any earlier snapshot. */
	async capture(): Promise<ThemeSnapshot> {
		const css = collectThemeCss(this.app);
		const body = activeDocument.body;
		const meta: ThemeSnapshot = {
			name: currentThemeName(this.app),
			hash: await sha1(css),
			capturedAt: Date.now(),
			bytes: css.length,
			bodyClasses: Array.from(body.classList)
				.filter(c => /^[\w-]+$/.test(c) && !VOLATILE_BODY_CLASS.test(c))
				.join(' '),
			bodyStyle: body.style.cssText,
			palette: extractObsidianPalette(),
			uploads: {},
		};
		await this.app.vault.adapter.write(this.path, css);
		this.plugin.settings.themeSnapshot = meta;
		await this.plugin.saveSettings();
		return meta;
	}

	/** The saved snapshot, capturing one first if there is none (or its file went missing). */
	async ensure(): Promise<CapturedTheme> {
		const meta = this.meta;
		if (meta && await this.app.vault.adapter.exists(this.path)) {
			return { meta, css: await this.app.vault.adapter.read(this.path) };
		}
		const fresh = await this.capture();
		return { meta: fresh, css: await this.app.vault.adapter.read(this.path) };
	}

	/** Remember where this snapshot's CSS already lives so re-shares skip the upload. */
	async recordUpload(target: string, url: string): Promise<void> {
		const meta = this.meta;
		if (!meta) return;
		meta.uploads[target] = url;
		await this.plugin.saveSettings();
	}
}

export function currentThemeName(app: App): string {
	const theme = (app as unknown as { customCss?: { theme?: string } }).customCss?.theme;
	return theme || 'Default';
}

// ═══ CSS collection ═══

interface CustomCssInternals {
	styleEl?: HTMLStyleElement;
	extraStyleEls?: HTMLStyleElement[];
}

function collectThemeCss(app: App): string {
	const doc = activeDocument;
	const sheets: CSSStyleSheet[] = [];
	const appCss = Array.from(doc.styleSheets).find(s => /\/app\.css(\?|$)/.test(s.href || ''));
	if (appCss) sheets.push(appCss);
	const custom = (app as unknown as { customCss?: CustomCssInternals }).customCss;
	if (custom?.styleEl?.sheet) sheets.push(custom.styleEl.sheet);
	for (const el of custom?.extraStyleEls ?? []) {
		if (el.sheet) sheets.push(el.sheet);
	}
	// Style Settings writes the user's theme options into its own <style>
	const styleSettings = doc.getElementById('css-settings-manager');
	if (styleSettings instanceof HTMLStyleElement && styleSettings.sheet) sheets.push(styleSettings.sheet);

	const out: string[] = [];
	for (const sheet of sheets) {
		try {
			out.push(serializeRules(sheet.cssRules));
		} catch {
			// cross-origin sheet — unreadable, skip
		}
	}
	return out.filter(Boolean).join('\n');
}

function serializeRules(rules: CSSRuleList): string {
	const out: string[] = [];
	for (const rule of Array.from(rules)) {
		if (rule instanceof CSSStyleRule) {
			// variable-only rules stay: themes park their palette on chrome
			// containers (.app-container) that the share page recreates
			if (isVariablesOnly(rule) || !isChromeOnly(rule.selectorText)) out.push(rule.cssText);
		} else if (rule instanceof CSSMediaRule) {
			if (/\bprint\b/.test(rule.conditionText) && !/\bscreen\b/.test(rule.conditionText)) continue;
			const inner = serializeRules(rule.cssRules);
			if (inner) out.push(`@media ${rule.conditionText}{${inner}}`);
		} else if (rule instanceof CSSSupportsRule) {
			const inner = serializeRules(rule.cssRules);
			if (inner) out.push(`@supports ${rule.conditionText}{${inner}}`);
		} else if (rule instanceof CSSImportRule) {
			continue;
		} else if (rule instanceof CSSFontFaceRule) {
			// app:// fonts only resolve inside Obsidian
			if (!rule.cssText.includes('app://')) out.push(rule.cssText);
		} else {
			out.push(rule.cssText);
		}
	}
	return out.join('\n');
}

function isVariablesOnly(rule: CSSStyleRule): boolean {
	const style = rule.style;
	// nested rules (CSS nesting) carry real declarations
	if (style.length === 0 || (rule as CSSStyleRule & { cssRules?: CSSRuleList }).cssRules?.length) return false;
	for (let i = 0; i < style.length; i++) {
		if (!style[i].startsWith('--')) return false;
	}
	return true;
}

function isChromeOnly(selectorText: string): boolean {
	// `body:not(.is-mobile) .markdown-rendered h1` must survive — tokens
	// inside :not() exclude chrome rather than require it
	const positive = selectorText.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '');
	return positive.split(',').every(sel => CHROME_TOKENS.some(token => sel.includes(token)));
}

// ═══ Palette extraction (share-page chrome + "colors only" mode) ═══
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
	const probe = activeDocument.body.createDiv({ cls: mode });
	probe.setCssStyles({ position: 'absolute', visibility: 'hidden' });
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

export function extractObsidianPalette(): ThemePalette {
	const body = activeDocument.body;
	const isDark = body.classList.contains('theme-dark');
	// the ACTIVE mode reads exactly from live computed styles
	const active = toVars(readVars(body), isDark ? PALETTES.cmds.dark : PALETTES.cmds.light);
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
