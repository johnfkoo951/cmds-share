import { NoteTemplateData, ShareTheme, ThemePalette, ThemeVars } from './types';

const LOGO_URL = 'https://cmdspace.work/assets/logos/cmds-logo-round.png';
const OG_IMAGE_URL = 'https://share.cmdspace.work/assets/og/og-share.png';

/** Built-in share-page palettes. 'obsidian' is resolved at share time in api.ts. */
export const PALETTES: Record<Exclude<ShareTheme, 'obsidian' | 'obsidian-native'>, ThemePalette> = {
	cmds: {
		light: {
			text: '#1a1a1a', muted: '#666', bg: '#fff',
			accent: '#134538', accentLight: '#1a5c4a', accentOn: '#fff',
			border: '#e5e5e5', codeBg: '#f5f5f5', cardBg: '#fff',
			preBg: '#f5f6f4', preFg: '#24292e', graphNote: '#22896a',
		},
		dark: {
			text: '#f2f4f3', muted: '#9aa39d', bg: '#06080a',
			accent: '#E985A2', accentLight: '#F4A4B8', accentOn: '#1a0f14',
			border: '#1a231f', codeBg: '#161c19', cardBg: '#0d1411',
			preBg: '#0a0d0b', preFg: '#e0e0e0', graphNote: '#2fb488',
		},
	},
	mono: {
		light: {
			text: '#111', muted: '#6b6b6b', bg: '#fff',
			accent: '#111', accentLight: '#333', accentOn: '#fff',
			border: '#e4e4e4', codeBg: '#f4f4f4', cardBg: '#fff',
			preBg: '#f6f6f6', preFg: '#222', graphNote: '#555',
		},
		dark: {
			text: '#ececec', muted: '#9a9a9a', bg: '#0a0a0a',
			accent: '#ececec', accentLight: '#fff', accentOn: '#0a0a0a',
			border: '#242424', codeBg: '#161616', cardBg: '#101010',
			preBg: '#111', preFg: '#ddd', graphNote: '#aaa',
		},
	},
	sepia: {
		light: {
			text: '#3d3427', muted: '#8a7a63', bg: '#f8f2e7',
			accent: '#8a5a2b', accentLight: '#a5713c', accentOn: '#fff',
			border: '#e6dcc9', codeBg: '#efe6d4', cardBg: '#fdf9f0',
			preBg: '#f1e9d8', preFg: '#4a3f2e', graphNote: '#8a5a2b',
		},
		dark: {
			text: '#e8ded0', muted: '#a3947d', bg: '#201a12',
			accent: '#d9a05b', accentLight: '#e6b678', accentOn: '#241a0d',
			border: '#3a3123', codeBg: '#2a2318', cardBg: '#271f15',
			preBg: '#231c12', preFg: '#ddd2c0', graphNote: '#d9a05b',
		},
	},
	ocean: {
		light: {
			text: '#14212b', muted: '#5b7183', bg: '#fafcfd',
			accent: '#0b5c8a', accentLight: '#13729f', accentOn: '#fff',
			border: '#dfe8ee', codeBg: '#eef4f8', cardBg: '#fff',
			preBg: '#eef3f7', preFg: '#1e2f3c', graphNote: '#0e7fae',
		},
		dark: {
			text: '#e6eef4', muted: '#8ca3b4', bg: '#06121a',
			accent: '#58b7e6', accentLight: '#7cc8ef', accentOn: '#04121b',
			border: '#152733', codeBg: '#0c1e2a', cardBg: '#0a1a24',
			preBg: '#081722', preFg: '#d5e4ee', graphNote: '#58b7e6',
		},
	},
};

/**
 * CMDS typography for the note body. ID-scoped, so it beats any theme CSS —
 * which is why it is left out entirely when the page carries the user's own
 * Obsidian theme (nativeTheme).
 */
const NOTE_TYPOGRAPHY_CSS = `
#note-content { font-size: 1rem; overflow-wrap: break-word; }
#note-content h1, #note-content h2, #note-content h3,
#note-content h4, #note-content h5, #note-content h6 {
	font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;
	margin: 2rem 0 0.75rem; scroll-margin-top: 1.5rem;
}
#note-content h1 { font-size: 1.85rem; margin-top: 2.4rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
#note-content h2 { font-size: 1.4rem; margin-top: 2.2rem; }
#note-content h3 { font-size: 1.18rem; }
#note-content h4 { font-size: 1.06rem; color: var(--text); margin-top: 1.8rem; }
#note-content h5 { font-size: 0.98rem; color: var(--text); }
#note-content h6 { font-size: 0.9rem; color: var(--muted); }
#note-content p { margin: 0.85rem 0; }
#note-content ul, #note-content ol { margin: 0.85rem 0 0.85rem 1.4rem; }
#note-content li { margin: 0.35rem 0; }
#note-content li > ul, #note-content li > ol { margin: 0.25rem 0 0.25rem 1.2rem; }
#note-content a {
	color: var(--accent); text-decoration: none;
	border-bottom: 1px solid transparent; transition: border-color .15s;
}
#note-content a:hover { border-bottom-color: var(--accent); }
#note-content code {
	background: var(--code-bg); padding: 0.18em 0.45em; border-radius: 6px;
	font-size: 0.86em; font-family: 'SF Mono', 'Menlo', monospace;
}
#note-content pre {
	background: var(--pre-bg); color: var(--pre-fg);
	border: 1px solid var(--border);
	padding: 1rem; border-radius: 12px;
	overflow-x: auto; font-size: 0.85rem; line-height: 1.6;
	font-family: 'SF Mono', 'Menlo', monospace; margin: 1rem 0;
	position: relative;
}
#note-content pre code { background: transparent; padding: 0; font-size: 1em; }
#note-content pre[data-lang]::before {
	content: attr(data-lang);
	position: absolute; top: 7px; left: 12px;
	font-size: 0.66rem; font-weight: 600; letter-spacing: 0.05em;
	color: var(--muted); opacity: 0.75; text-transform: lowercase;
	font-family: -apple-system, sans-serif;
}
#note-content pre[data-lang] { padding-top: 1.9rem; }
#note-content blockquote {
	border-left: 3px solid var(--accent); padding: 0.5rem 1rem;
	margin: 1rem 0; color: var(--muted); background: var(--code-bg);
	border-radius: 0 8px 8px 0;
}
#note-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
#note-content table {
	border-collapse: collapse; margin: 1rem 0;
	font-size: 0.9rem;
	/* wide tables scroll inside themselves instead of panning the page */
	display: block; width: max-content; min-width: 60%; max-width: 100%;
	overflow-x: auto;
}
#note-content th, #note-content td {
	border: none; border-bottom: 1px solid var(--border);
	padding: 0.65rem 0.9rem; text-align: left; vertical-align: top;
}
#note-content th { font-weight: 700; font-size: 0.85rem; color: var(--muted); border-bottom-width: 2px; }
#note-content tr:last-child td { border-bottom: none; }
#note-content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
#note-content mark { background: rgba(233,133,162,0.25); padding: 0 0.2rem; border-radius: 3px; }
#note-content .callout {
	--co: var(--accent);
	background: var(--code-bg); border-radius: 8px; padding: 0.9rem 1rem;
	margin: 1rem 0; border-left: 3px solid var(--co);
}
#note-content .callout-title {
	display: flex; align-items: center; gap: 0.5em;
	font-weight: 700; color: var(--co); margin: 0;
}
#note-content .callout-icon { display: flex; align-items: center; flex-shrink: 0; }
#note-content .callout-icon svg, #note-content .callout-title > svg {
	width: 1.1em; height: 1.1em;
}
#note-content .callout-title-inner { line-height: 1.45; }
#note-content .callout-fold { display: none; }
#note-content .callout.is-collapsible > .callout-title { cursor: pointer; }
#note-content .callout.is-collapsible .callout-fold {
	display: flex; margin-left: auto; color: var(--muted); transition: transform .15s;
}
#note-content .callout.is-collapsed .callout-fold { transform: rotate(-90deg); }
#note-content .callout-fold svg { width: 1em; height: 1em; }
#note-content .callout-content > :first-child { margin-top: 0.45rem; }
#note-content .callout-content > :last-child { margin-bottom: 0.1rem; }
#note-content .callout[data-callout="abstract"], #note-content .callout[data-callout="summary"], #note-content .callout[data-callout="tldr"] { --co: #23a8b8; }
#note-content .callout[data-callout="info"], #note-content .callout[data-callout="note"], #note-content .callout[data-callout="todo"] { --co: #4a8edb; }
#note-content .callout[data-callout="tip"], #note-content .callout[data-callout="hint"], #note-content .callout[data-callout="important"] { --co: #23b89b; }
#note-content .callout[data-callout="success"], #note-content .callout[data-callout="check"], #note-content .callout[data-callout="done"] { --co: #3aa657; }
#note-content .callout[data-callout="question"], #note-content .callout[data-callout="help"], #note-content .callout[data-callout="faq"] { --co: #d9a13b; }
#note-content .callout[data-callout="warning"], #note-content .callout[data-callout="caution"], #note-content .callout[data-callout="attention"] { --co: #e0813a; }
#note-content .callout[data-callout="danger"], #note-content .callout[data-callout="error"], #note-content .callout[data-callout="failure"], #note-content .callout[data-callout="fail"], #note-content .callout[data-callout="missing"], #note-content .callout[data-callout="bug"] { --co: #e05252; }
#note-content .callout[data-callout="example"] { --co: #8a6fd6; }
#note-content .callout[data-callout="quote"], #note-content .callout[data-callout="cite"] { --co: var(--muted); }
#note-content .internal-link {
	color: var(--accent); border-bottom: 1px dashed var(--accent); cursor: help;
}
`;

/**
 * With app.css + theme loaded, undo what makes sense in the app window but not
 * on a scrolling web page, and keep the page's own buttons out of Obsidian's
 * button styling.
 */
const NATIVE_THEME_FIXUPS_CSS = `
html { height: auto; overflow-y: auto; }
/* app.css makes body a fixed, contain:strict app frame — a page needs normal flow */
body.cmds-native {
	height: auto; min-height: 100%; overflow: visible; overflow-x: hidden;
	contain: none; position: static;
	user-select: text; -webkit-user-select: text;
}
body.cmds-native .app-container {
	display: block; height: auto; width: auto; position: static;
	overflow: visible; contain: none; background: none;
}
body.cmds-native #note-content.markdown-preview-view {
	width: auto; height: auto; padding: 0; overflow: visible;
	font-size: var(--font-text-size, 16px);
}
body.cmds-native button.tool-btn, body.cmds-native button.pin-btn,
body.cmds-native button.code-copy, body.cmds-native .cmds-canvas-ui button {
	box-shadow: none; padding: 0; font: inherit;
}
body.cmds-native button.tool-btn { background: var(--card-bg); }
body.cmds-native button.pin-btn, body.cmds-native .cmds-canvas-ui button { background: transparent; }
body.cmds-native button.pin-btn:hover, body.cmds-native .cmds-canvas-ui button:hover { background: var(--code-bg); }
body.cmds-native button.code-copy { background: color-mix(in srgb, var(--card-bg) 92%, transparent); }
`;

/** Self-contained task checkboxes for the CMDS palettes (no app.css on the page). */
const CHECKBOX_CSS = `
#note-content li.task-list-item { list-style: none !important; }
#note-content input[type="checkbox"] {
	all: revert !important;
	appearance: auto !important;
	display: inline-block !important;
	position: static !important;
	width: 1em !important; height: 1em !important;
	margin: 0 0.5em 0 0 !important;
	vertical-align: -0.1em !important;
	opacity: 1 !important;
	accent-color: var(--accent) !important;
}
#note-content input[type="checkbox"]::before,
#note-content input[type="checkbox"]::after { content: none !important; display: none !important; }
`;

function varsCss(v: ThemeVars): string {
	return [
		`--text: ${v.text}`, `--muted: ${v.muted}`, `--bg: ${v.bg}`,
		`--accent: ${v.accent}`, `--accent-light: ${v.accentLight}`, `--accent-on: ${v.accentOn}`,
		`--border: ${v.border}`, `--code-bg: ${v.codeBg}`, `--card-bg: ${v.cardBg}`,
		`--pre-bg: ${v.preBg}`, `--pre-fg: ${v.preFg}`, `--graph-note: ${v.graphNote}`,
	].join(';\n\t') + ';';
}

export function generateNoteHtml(data: NoteTemplateData): string {
	const {
		title,
		showTitle,
		kind = 'note',
		layout = 'note',
		palette,
		themeName,
		colorMode = 'auto',
		nativeTheme,
		footerLink,
		content,
		url,
		lang,
		cssUrl,
		noteWidth,
		encrypted,
		encryptedData,
		description,
		graph,
		markdown,
		expiresAt,
	} = data;

	const safeTitle = escapeHtml(title);
	const safeDesc = escapeHtml((description || title).slice(0, 200));
	const safeUrl = url ? escapeAttr(url) : '';
	const ogLocale = lang === 'ko' ? 'ko_KR' : 'en_US';
	const ogLocaleAlt = lang === 'ko' ? 'en_US' : 'ko_KR';

	const urlMeta = safeUrl
		? `<link rel="canonical" href="${safeUrl}">
<meta property="og:url" content="${safeUrl}">`
		: '';

	const cssLink = cssUrl
		? `<link rel="stylesheet" href="${escapeAttr(cssUrl)}">`
		: '';

	const encryptedDataDiv = encrypted && encryptedData
		? `<script type="application/json" id="encrypted-data">${escapeJson(encryptedData)}</script>`
		: '';

	const graphDataDiv = graph
		? `<script type="application/json" id="graph-data">${escapeJson(JSON.stringify(graph))}</script>`
		: '';

	// base64 keeps the raw markdown inert inside the HTML (no </script> risk)
	const mdSourceDiv = markdown != null
		? `<script type="text/plain" id="md-source">${textToBase64(markdown)}</script>`
		: '';

	const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
	const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
	const e2eBadge = encrypted
		? `<span class="cmds-badge b-e2e">${ICON_LOCK}${lang === 'ko' ? '종단간 암호화' : 'End-to-end encrypted'}</span>`
		: '';
	// countdown is computed at view time so the number stays honest
	const expiryBadge = expiresAt
		? `<span class="cmds-badge" id="expiryBadge" data-expires="${expiresAt}" data-lang="${lang}" hidden>${ICON_CLOCK}<span id="expiryText"></span></span>`
		: '';
	const badgesHtml = e2eBadge || expiryBadge
		? `<div class="cmds-badges">${e2eBadge}${expiryBadge}</div>`
		: '';

	const decryptionScript = encrypted ? DECRYPTION_SCRIPT : '';

	const KIND_LABEL: Record<string, string> = { excalidraw: 'Excalidraw', canvas: 'Canvas', base: 'Base' };
	const kindPill = KIND_LABEL[kind]
		? `<span class="cmds-doc-kind">${escapeHtml(KIND_LABEL[kind])}</span>`
		: '';
	// the title is already public in <title>/og:title, so the heading leaks
	// nothing extra on encrypted shares
	const titleHeader = showTitle
		? `<header class="cmds-doc-header">${kindPill}<h1 class="cmds-doc-title">${safeTitle}</h1></header>`
		: '';

	// the full theme styles reading view, which is .markdown-preview-view
	const articleCls = nativeTheme ? 'markdown-preview-view markdown-rendered' : 'markdown-rendered';
	const bodyContent = titleHeader + (encrypted
		? `<article id="note-content" class="${articleCls}"><p class="cmds-loading">Decrypting…</p></article>`
		: `<article id="note-content" class="${articleCls}">${content}</article>`);

	const bodyCls = ['cmds-kind-' + kind, 'cmds-layout-' + layout]
		.concat(nativeTheme ? ['cmds-native', nativeTheme.bodyClasses] : [])
		.filter(Boolean).join(' ');
	const bodyStyleAttr = nativeTheme?.bodyStyle ? ` style="${escapeAttr(nativeTheme.bodyStyle)}"` : '';
	// a fixed mode ignores the viewer's preference and hides the toggle
	const forcedMode = colorMode === 'light' || colorMode === 'dark' ? colorMode : '';

	return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}">
${urlMeta}

<link rel="icon" type="image/png" href="${LOGO_URL}">
<link rel="apple-touch-icon" href="${LOGO_URL}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="CMDSPACE">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:image" content="${OG_IMAGE_URL}">
<meta property="og:image:secure_url" content="${OG_IMAGE_URL}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="CMDS Share — ${safeTitle}">
<meta property="og:locale" content="${ogLocale}">
<meta property="og:locale:alternate" content="${ogLocaleAlt}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
<meta name="twitter:image" content="${OG_IMAGE_URL}">

<script>
(function(){try{var f='${forcedMode}';if(f){document.documentElement.dataset.theme=f;return;}var t=localStorage.getItem('cmds-theme');if(t){document.documentElement.dataset.theme=t;}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}else{document.documentElement.dataset.theme='light';}}catch(e){}})();
</script>

<style>
:root {
	--max: ${escapeAttr(noteWidth)};
	${varsCss(palette.light)}
}
[data-theme="dark"] {
	${varsCss(palette.dark)}
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
	${varsCss(palette.dark)}
	}
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { color-scheme: light dark; scroll-behavior: smooth; }
html, body { overflow-x: hidden; }
body {
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Pretendard Variable', 'Pretendard', 'Apple SD Gothic Neo', 'Segoe UI', system-ui, sans-serif;
	color: var(--text); background: var(--bg); line-height: 1.75;
	font-size: 16px; -webkit-font-smoothing: antialiased;
	transition: background-color .2s, color .2s;
}

.side-tools {
	position: fixed; top: 1rem; right: 1rem; z-index: 100;
	display: flex; flex-direction: column; gap: 0.5rem;
}
.tool-btn {
	width: 36px; height: 36px;
	background: var(--card-bg);
	border: 1px solid var(--border);
	border-radius: 50%;
	cursor: pointer;
	display: grid; place-items: center;
	color: var(--text);
	transition: border-color .15s, background .15s, color .15s;
}
.tool-btn[hidden] { display: none; }
.tool-btn:hover { border-color: var(--accent); }
.tool-btn.active { border-color: var(--accent); color: var(--accent); }
.tool-btn svg { width: 16px; height: 16px; }

.side-panel {
	position: fixed; top: 1rem; right: 4rem; z-index: 99;
	width: 280px; max-height: calc(100vh - 2rem);
	overflow-y: auto;
	background: var(--card-bg);
	border: 1px solid var(--border);
	border-radius: 12px;
	padding: 1rem 1.1rem;
	display: none;
	box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}
.side-panel.open { display: block; }
.panel-head {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 0.6rem;
}
.panel-head h3 {
	font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
	letter-spacing: 0.08em; color: var(--muted);
}
.pin-btn {
	background: none; border: none; cursor: pointer; color: var(--muted);
	width: 22px; height: 22px; display: grid; place-items: center;
	border-radius: 5px;
}
.pin-btn:hover { color: var(--accent); background: var(--code-bg); }
.pin-btn svg { width: 13px; height: 13px; }
.g-controls { display: flex; gap: 2px; align-items: center; }

/* docked mode: persistent right sidebar — TOC on top (scrolls), graph fills the rest */
body.cmds-docked { padding-right: 312px; }
body.cmds-docked .side-tools { right: calc(312px + 1rem); }
body.cmds-docked #tocToggle, body.cmds-docked #graphToggle { display: none; }
body.cmds-docked .pin-btn { color: var(--accent); }
.side-dock {
	position: fixed; top: 0; right: 0; bottom: 0; width: 312px; z-index: 98;
	background: var(--card-bg); border-left: 1px solid var(--border);
	display: flex; flex-direction: column;
}
.side-dock[hidden] { display: none; }
.side-dock .side-panel {
	position: static; display: block; width: auto; max-height: none;
	border: none; border-radius: 0; box-shadow: none;
}
.side-dock #tocPanel { flex: 0 1 auto; min-height: 120px; max-height: 58%; overflow-y: auto; }
.side-dock #graphPanel {
	flex: 1 1 auto; min-height: 220px; overflow: hidden;
	border-top: 1px solid var(--border);
	display: flex; flex-direction: column;
}
.side-dock #graphPanel canvas { flex: 1; min-height: 0; }
#graphCanvas { touch-action: none; cursor: grab; }
#graphCanvas.dragging { cursor: grabbing; }
#graphCanvas.on-node { cursor: pointer; }
#tocList { display: flex; flex-direction: column; gap: 2px; }
#tocList a {
	color: var(--text); text-decoration: none; font-size: 0.82rem;
	line-height: 1.4; padding: 0.25rem 0.5rem; border-radius: 6px;
	display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#tocList a:hover { background: var(--code-bg); color: var(--accent); }
#tocList a.active { background: var(--code-bg); color: var(--accent); font-weight: 600; }
#tocList a.toc-h2 { padding-left: 1.1rem; }
#tocList a.toc-h3 { padding-left: 1.7rem; font-size: 0.78rem; color: var(--muted); }
#tocList a.toc-h4 { padding-left: 2.3rem; font-size: 0.78rem; color: var(--muted); }
#graphCanvas { width: 100%; display: block; }
.graph-legend {
	display: flex; gap: 0.9rem; margin-top: 0.5rem;
	font-size: 0.7rem; color: var(--muted);
}
.graph-legend span::before {
	content: ''; display: inline-block; width: 8px; height: 8px;
	border-radius: 50%; margin-right: 4px;
}
.graph-legend .lg-link::before { background: var(--graph-note); }
.graph-legend .lg-tag::before { background: #E985A2; }

main {
	max-width: var(--max); margin: 0 auto; padding: 4rem 1.5rem 3rem;
}

${nativeTheme ? '' : NOTE_TYPOGRAPHY_CSS}
#note-content pre { position: relative; }
.code-copy {
	position: absolute; top: 8px; right: 8px;
	width: 28px; height: 28px; border-radius: 6px;
	background: color-mix(in srgb, var(--card-bg) 92%, transparent);
	backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
	border: 1px solid var(--border);
	box-shadow: 0 1px 5px rgba(0, 0, 0, 0.18);
	color: var(--muted); cursor: pointer;
	display: grid; place-items: center;
	opacity: 0; transition: opacity .15s, color .15s, border-color .15s;
}
#note-content pre:hover .code-copy, .code-copy.copied { opacity: 1; }
.code-copy:hover, .code-copy.copied { color: var(--accent); border-color: var(--accent); }
.code-copy svg { width: 14px; height: 14px; }
.h-anchor {
	margin-left: 0.4rem; opacity: 0; color: var(--muted);
	border-bottom: none !important; transition: opacity .15s, color .15s;
}
.h-anchor svg { width: 0.75em; height: 0.75em; }
.h-anchor:hover { color: var(--accent); }
#note-content h1:hover .h-anchor, #note-content h2:hover .h-anchor,
#note-content h3:hover .h-anchor, #note-content h4:hover .h-anchor { opacity: 0.75; }
.mermaid-container { margin: 1rem 0; overflow-x: auto; text-align: center; }
.mermaid-container svg { max-width: 100%; height: auto; }

/* ── title heading ── */
.cmds-doc-header { margin: 0 0 2rem; }
.cmds-doc-kind {
	display: inline-block; margin-bottom: 0.7rem;
	font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
	color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent);
	border-radius: 999px; padding: 0.2rem 0.65rem;
}
.cmds-doc-title {
	font-size: clamp(1.9rem, 4.2vw, 2.6rem); font-weight: 800;
	letter-spacing: -0.03em; line-height: 1.18; text-wrap: balance;
}
#note-content > :first-child, #note-content > .markdown-preview-sizer > :first-child { margin-top: 0; }

/* ── wide layout (drawings, canvases, bases) ── */
body.cmds-layout-wide { --max: 1320px; }
body.cmds-layout-wide main { padding-top: 3.5rem; }

/* ── Excalidraw ── */
.cmds-excalidraw { margin: 0; }
.cmds-excalidraw > svg {
	border-radius: 14px; border: 1px solid var(--border);
	box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.10);
}

/* ── JSON Canvas ── */
:root {
	--cv-c1: #e93147; --cv-c2: #ec7500; --cv-c3: #e0ac00;
	--cv-c4: #08b94e; --cv-c5: #00bfbc; --cv-c6: #7852ee;
}
.cmds-canvas {
	position: relative; overflow: hidden; touch-action: none;
	border: 1px solid var(--border); border-radius: 14px; height: 70vh; min-height: 320px;
	background-color: var(--bg);
	background-image: radial-gradient(circle, color-mix(in srgb, var(--muted) 35%, transparent) 1px, transparent 1.2px);
	background-size: 22px 22px;
	cursor: grab; user-select: none;
}
.cmds-canvas.dragging { cursor: grabbing; }
.cmds-canvas:fullscreen { border-radius: 0; border: none; height: 100vh; }
.cmds-canvas-world { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.cmds-canvas-empty { padding: 2rem; color: var(--muted); text-align: center; }
.cv-group {
	position: absolute; border-radius: 14px;
	border: 2px solid var(--node-color, color-mix(in srgb, var(--muted) 45%, transparent));
	background: color-mix(in srgb, var(--node-color, var(--muted)) 7%, transparent);
}
.cv-group-label {
	position: absolute; bottom: 100%; left: 0; margin-bottom: 6px;
	font-size: 1.05rem; font-weight: 700; color: var(--node-color, var(--muted));
	white-space: nowrap;
}
.cv-edges { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }
.cv-edge path { fill: none; stroke: var(--edge-color, var(--muted)); stroke-width: 2.5; stroke-linecap: round; }
.cv-edge polygon { fill: var(--edge-color, var(--muted)); stroke: var(--edge-color, var(--muted)); stroke-width: 1; stroke-linejoin: round; }
.cv-edge-label {
	position: absolute; transform: translate(-50%, -50%);
	font-size: 0.8rem; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 6px;
	background: var(--bg); color: var(--edge-color, var(--muted));
	border: 1px solid color-mix(in srgb, var(--edge-color, var(--muted)) 40%, var(--border));
	white-space: nowrap;
}
.cv-node {
	position: absolute; display: flex; flex-direction: column;
	border-radius: 12px; overflow: visible;
	border: 2px solid var(--node-color, var(--border));
	background: color-mix(in srgb, var(--node-color, transparent) 9%, var(--card-bg));
	box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 6px 18px rgba(0,0,0,0.06);
}
.cv-body {
	flex: 1; min-height: 0; overflow: auto; padding: 0.9rem 1.1rem;
	font-size: 0.95rem; line-height: 1.6; user-select: text; cursor: auto;
	border-radius: 10px; overscroll-behavior: contain;
}
#note-content .cv-body > :first-child { margin-top: 0 !important; }
#note-content .cv-body > :last-child { margin-bottom: 0 !important; }
#note-content .cv-body h1 { font-size: 1.45rem; border: none; padding: 0; margin: 0.6rem 0 0.4rem; }
#note-content .cv-body h2 { font-size: 1.2rem; margin: 0.6rem 0 0.4rem; }
#note-content .cv-body h3, #note-content .cv-body h4 { font-size: 1.02rem; margin: 0.5rem 0 0.3rem; }
#note-content .cv-body .h-anchor { display: none; }
.cv-file-label {
	position: absolute; bottom: 100%; left: 2px; margin-bottom: 4px;
	font-size: 0.78rem; font-weight: 600; color: var(--muted);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.cv-image { background: transparent; box-shadow: none; border-color: transparent; }
.cv-image img { width: 100%; height: 100%; object-fit: contain; border-radius: 10px; }
.cv-body .cmds-excalidraw { border: none; padding: 0; background: transparent; }
.cv-missing { color: var(--muted); font-style: italic; display: grid; place-items: center; }
.cv-link-card {
	flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.3rem;
	padding: 1rem 1.2rem; text-decoration: none; color: var(--text); cursor: pointer; min-height: 0;
}
.cv-link-host { font-weight: 700; font-size: 1rem; color: var(--accent); }
.cv-link-url { font-size: 0.78rem; color: var(--muted); word-break: break-all; overflow: hidden; }
.cmds-canvas-ui {
	position: absolute; right: 12px; bottom: 12px; z-index: 2;
	display: flex; gap: 4px; padding: 4px; border-radius: 10px;
	background: color-mix(in srgb, var(--card-bg) 88%, transparent);
	border: 1px solid var(--border); backdrop-filter: blur(8px);
}
.cmds-canvas-ui button {
	width: 30px; height: 30px; border: none; border-radius: 7px; cursor: pointer;
	background: transparent; color: var(--text); display: grid; place-items: center;
}
.cmds-canvas-ui button:hover { background: var(--code-bg); color: var(--accent); }
.cmds-canvas-ui svg { width: 15px; height: 15px; }
.cmds-canvas-hint {
	position: absolute; left: 12px; bottom: 12px; z-index: 2;
	font-size: 0.72rem; color: var(--muted); pointer-events: none;
	background: color-mix(in srgb, var(--card-bg) 80%, transparent); padding: 0.2rem 0.5rem; border-radius: 6px;
}

/* ── Bases ── */
/* Fit (default): Obsidian-like single-line rows, columns sized to content,
   long values truncated. Wrap: values wrap at a readable width. Viewers can
   drag column edges (fixed widths) and click a row to expand it. */
.cmds-base-section + .cmds-base-section { margin-top: 2.5rem; }
#note-content .cmds-base-view-name { font-size: 1.2rem; border: none; padding: 0; margin: 0 0 0.6rem; }
.cmds-base-bar {
	display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
	flex-wrap: wrap; margin-bottom: 0.8rem;
}
.cmds-base-bar .cmds-base-count { margin: 0; }
.cmds-base-count { font-size: 0.8rem; color: var(--muted); margin-bottom: 0.8rem; font-variant-numeric: tabular-nums; }
.cmds-base-tools { display: inline-flex; gap: 4px; align-items: center; }
.cmds-base-tools button {
	font: inherit; font-size: 0.74rem; font-weight: 600; cursor: pointer;
	padding: 0.2rem 0.6rem; border-radius: 999px; box-shadow: none; height: auto;
	border: 1px solid var(--border); background: transparent; color: var(--muted);
}
.cmds-base-tools button:hover { color: var(--text); border-color: var(--accent); }
.cmds-base-tools button.on { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
.cmds-base-tools button[hidden] { display: none; }
.cmds-base-group + .cmds-base-group { margin-top: 1.6rem; }
.cmds-base-group-head {
	display: flex; align-items: center; gap: 0.5rem;
	font-weight: 700; font-size: 1rem; margin-bottom: 0.5rem;
}
.cmds-base-group-label.is-empty { color: var(--muted); font-weight: 500; font-style: italic; }
.cmds-base-group-count {
	font-size: 0.72rem; font-weight: 600; color: var(--muted);
	background: var(--code-bg); border-radius: 999px; padding: 0.05rem 0.5rem;
}
.cmds-base-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
#note-content table.cmds-base-table {
	display: table; table-layout: auto; width: max-content; min-width: 100%; max-width: none;
	margin: 0; border: none; border-collapse: collapse; font-size: 0.88rem;
}
#note-content table.cmds-base-table.is-sized { table-layout: fixed; min-width: 0; }
#note-content .cmds-base-table th {
	position: sticky; top: 0; z-index: 1; text-align: left; white-space: nowrap;
	font-size: 0.78rem; font-weight: 600; color: var(--muted); background: var(--card-bg);
	border: none; border-bottom: 1px solid var(--border); padding: 0.5rem 0.9rem;
	overflow: hidden; text-overflow: ellipsis;
}
#note-content .cmds-base-table td {
	border: none; border-bottom: 1px solid var(--border); padding: 0.45rem 0.9rem; vertical-align: top;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 26rem;
}
#note-content .cmds-base-table.is-sized td { max-width: none; }
#note-content .cmds-base-table td > * { margin: 0; }
#note-content .cmds-base-table td p { display: inline; }
#note-content .cmds-base-view.is-wrap .cmds-base-table td,
#note-content .cmds-base-table tr.is-expanded td {
	white-space: normal; overflow-wrap: anywhere; overflow: visible; max-width: 30rem; line-height: 1.55;
}
#note-content .cmds-base-view.is-wrap .cmds-base-table.is-sized td,
#note-content .cmds-base-table.is-sized tr.is-expanded td { max-width: none; }
#note-content .cmds-base-table tbody tr { cursor: pointer; }
#note-content .cmds-base-table tr.cmds-base-group-row { cursor: default; }
#note-content .cmds-base-table td.cmds-base-group-cell {
	white-space: nowrap; max-width: none; overflow: visible; background: none !important;
	padding: 1.1rem 0.9rem 0.45rem; border-bottom: 1px solid var(--border);
}
#note-content .cmds-base-table tbody:first-of-type td.cmds-base-group-cell { padding-top: 0.7rem; }
#note-content .cmds-base-table td.cmds-base-group-cell .cmds-base-group-head { margin: 0; position: sticky; left: 0.9rem; display: inline-flex; }
#note-content .cmds-base-table tr:last-child td { border-bottom: none; }
#note-content .cmds-base-table tbody tr:hover td { background: color-mix(in srgb, var(--accent) 5%, transparent); }
#note-content .cmds-base-table tr.is-expanded td { background: color-mix(in srgb, var(--accent) 7%, transparent); }
.cmds-col-grip {
	position: absolute; top: 0; right: 0; width: 9px; height: 100%;
	cursor: col-resize; z-index: 2; touch-action: none;
}
.cmds-col-grip::after {
	content: ''; position: absolute; top: 25%; bottom: 25%; right: 0; width: 1px;
	background: var(--border); transition: background .15s;
}
.cmds-col-grip:hover::after, .cmds-col-grip.dragging::after { background: var(--accent); top: 0; bottom: 0; width: 2px; }
.cmds-base-table th .cmds-th-inner { display: block; overflow: hidden; text-overflow: ellipsis; padding-right: 6px; }
.cmds-base-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.9rem; }
.cmds-base-card { border: 1px solid var(--border); border-radius: 12px; padding: 0.9rem 1rem; background: var(--card-bg); }
.cmds-base-card-title { font-weight: 700; margin-bottom: 0.5rem; }
.cmds-base-card-prop { display: flex; gap: 0.6rem; font-size: 0.82rem; line-height: 1.5; }
.cmds-base-card-key { color: var(--muted); flex: 0 0 38%; overflow: hidden; text-overflow: ellipsis; }
.cmds-base-card-val { flex: 1; min-width: 0; overflow-wrap: anywhere; }
#note-content .cmds-base .value-list-container { display: inline-flex; flex-wrap: wrap; gap: 4px; }
#note-content .cmds-base .value-list-element {
	background: var(--code-bg); border-radius: 6px; padding: 0 0.4rem; font-size: 0.85em;
}
#note-content .cmds-base .value-list-element p { margin: 0; }

.cmds-meta {
	max-width: var(--max); margin: 0 auto;
	padding: 2rem 1.5rem 2rem; border-top: 1px solid var(--border);
	font-size: 0.75rem; color: var(--muted); text-align: center;
	display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
}
.cmds-meta img { width: 28px; height: 28px; border-radius: 50%; }
.cmds-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.cmds-badge {
	display: inline-flex; align-items: center; gap: 0.35em;
	font-size: 0.7rem; font-weight: 600; color: var(--muted);
	border: 1px solid var(--border); border-radius: 999px;
	padding: 0.22rem 0.65rem; background: var(--card-bg);
}
.cmds-badge svg { width: 12px; height: 12px; }
.cmds-badge.b-e2e { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }
.cmds-badge.b-soon { color: #e0813a; border-color: color-mix(in srgb, #e0813a 45%, var(--border)); }
.cmds-badge.b-expired { color: #e05252; border-color: color-mix(in srgb, #e05252 45%, var(--border)); }
.cmds-meta a { color: var(--accent); text-decoration: none; font-weight: 600; }
.cmds-meta a:hover { text-decoration: underline; }
.cmds-theme-note { font-size: 0.68rem; color: var(--muted); opacity: 0.75; }
.cmds-author-link {
	margin-top: 0.35rem; font-size: 0.85rem; font-weight: 700;
	letter-spacing: -0.01em;
}
.cmds-loading { color: var(--muted); font-style: italic; }
.decrypt-error {
	color: #c62828; background: #fce4ec; padding: 1rem; border-radius: 8px;
	border: 1px solid #c62828; margin: 2rem 0; text-align: center;
}
[data-theme="dark"] .decrypt-error { background: #4a1a24; color: #ff8899; border-color: #ff8899; }

@media (max-width: 720px) {
	.side-panel { right: 1rem; top: 4rem; width: min(280px, calc(100vw - 2rem)); }
}
</style>
${cssLink}
${nativeTheme ? `<style>${NATIVE_THEME_FIXUPS_CSS}</style>` : `<style>${CHECKBOX_CSS}</style>`}
</head>
<body class="${escapeAttr(bodyCls)}"${bodyStyleAttr}>
<script>
// Obsidian themes switch on body.theme-light / body.theme-dark
(function(){var b=document.body,r=document.documentElement;function sync(){var d=r.dataset.theme==='dark';b.classList.toggle('theme-dark',d);b.classList.toggle('theme-light',!d);}sync();new MutationObserver(sync).observe(r,{attributes:true,attributeFilter:['data-theme']});})();
</script>

${nativeTheme ? '<div class="app-container">' : ''}
<div class="side-tools">
	<button class="tool-btn" id="themeToggle" aria-label="Toggle theme"${forcedMode ? ' hidden' : ''}>
		<svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
	</button>
	<button class="tool-btn" id="tocToggle" aria-label="Table of contents" hidden>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h13"/></svg>
	</button>
	<button class="tool-btn" id="graphToggle" aria-label="Local graph" hidden>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M10.8 6.9 6.2 16m7-9.1 4.6 9.1M7.2 18h9.6"/></svg>
	</button>
	<button class="tool-btn" id="mdCopy" aria-label="Copy markdown" title="Copy markdown" hidden>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5"/></svg>
	</button>
	<button class="tool-btn" id="mdDownload" aria-label="Download markdown" title="Download .md" hidden>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 19h16"/></svg>
	</button>
</div>

<div class="side-dock" id="sideDock" hidden></div>

<aside class="side-panel" id="tocPanel"><div class="panel-head"><h3>Contents</h3><button class="pin-btn" data-pin aria-label="Dock panels" title="Dock / undock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M9 3h6l1 7 3 2H5l3-2 1-7z"/></svg></button></div><nav id="tocList"></nav></aside>
<aside class="side-panel" id="graphPanel"><div class="panel-head"><h3>Local Graph</h3><span class="g-controls"><button class="pin-btn" id="gZoomOut" aria-label="Zoom out" title="Zoom out"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button><button class="pin-btn" id="gZoomIn" aria-label="Zoom in" title="Zoom in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button><button class="pin-btn" id="gReset" aria-label="Reset view" title="Reset view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/></svg></button><button class="pin-btn" data-pin aria-label="Dock panels" title="Dock / undock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M9 3h6l1 7 3 2H5l3-2 1-7z"/></svg></button></span></div><canvas id="graphCanvas"></canvas>
<div class="graph-legend"><span class="lg-link">Notes</span><span class="lg-tag">Tags</span></div></aside>

<main>
	${bodyContent}
</main>

<footer class="cmds-meta">
	${badgesHtml}
	<a href="https://cmdspace.work" target="_blank" rel="noopener"><img src="${LOGO_URL}" alt="CMDSPACE"></a>
	<span>Shared via <a href="https://github.com/johnfkoo951/cmds-share" target="_blank" rel="noopener">CMDS Share</a></span>
	<span class="cmds-theme-note">Theme: ${escapeHtml(themeName)}</span>
	${footerLink ? `<a class="cmds-author-link" href="${escapeAttr(footerLink.url)}" target="_blank" rel="noopener">${escapeHtml(footerLink.label)}</a>` : ''}
</footer>
${nativeTheme ? '</div>' : ''}

${encryptedDataDiv}
${graphDataDiv}
${mdSourceDiv}
${decryptionScript}

<script type="module">
(async function() {
	// mermaid sources travel base64-encoded in data-mmd; render with the LATEST mermaid
	if (document.getElementById('encrypted-data') && !window.__cmdsReady) {
		await new Promise(function(r) { document.addEventListener('cmds-content-ready', r, { once: true }); });
	}
	var containers = Array.from(document.querySelectorAll('.mermaid-container[data-mmd]'));
	if (!containers.length) return;
	function decode(b64) {
		var bin = atob(b64); var bytes = new Uint8Array(bin.length);
		for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return new TextDecoder().decode(bytes);
	}
	var sources = containers.map(function(d) { return decode(d.getAttribute('data-mmd')); });
	var mermaid;
	try {
		mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs')).default;
	} catch (e) {
		containers.forEach(function(d, i) {
			var pre = document.createElement('pre');
			pre.textContent = sources[i];
			d.replaceWith(pre);
		});
		return;
	}
	var seq = 0;
	async function renderAll() {
		var dark = document.documentElement.dataset.theme === 'dark';
		mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict' });
		for (var i = 0; i < containers.length; i++) {
			try {
				var out = await mermaid.render('cmds-mmd-' + i + '-' + (seq++), sources[i]);
				containers[i].innerHTML = out.svg;
			} catch (e) {
				var pre = document.createElement('pre');
				pre.textContent = sources[i];
				containers[i].innerHTML = '';
				containers[i].appendChild(pre);
			}
		}
	}
	await renderAll();
	new MutationObserver(function() { renderAll(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
</script>


<script>
(function() {
	var icon = document.getElementById('themeIcon');
	var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
	var MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
	function paint(theme) {
		if (icon) icon.innerHTML = theme === 'dark' ? MOON : SUN;
	}
	var btn = document.getElementById('themeToggle');
	if (btn) btn.addEventListener('click', function() {
		var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
		document.documentElement.dataset.theme = next;
		try { localStorage.setItem('cmds-theme', next); } catch(e) {}
		paint(next);
	});
	paint(document.documentElement.dataset.theme || 'light');
})();
</script>

<script>
(function() {
	var badge = document.getElementById('expiryBadge');
	if (!badge) return;
	var ts = Number(badge.getAttribute('data-expires'));
	if (!ts) return;
	var ko = badge.getAttribute('data-lang') === 'ko';
	var text = document.getElementById('expiryText');
	function render() {
		var msLeft = ts - Date.now();
		var d = new Date(ts);
		var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
		if (msLeft <= 0) {
			text.textContent = ko ? '만료됨' : 'Expired';
			badge.classList.add('b-expired');
			// file-hosting backends (GitHub Pages, NAS…) have no server to
			// 410 an expired share — hide the body here as a soft tombstone
			var body = document.getElementById('note-content');
			if (body && !body.dataset.tombstoned) {
				body.dataset.tombstoned = '1';
				body.innerHTML = '<p class="cmds-loading">' + (ko ? '이 공유는 만료되었습니다.' : 'This shared note has expired.') + '</p>';
				var toc = document.getElementById('tocToggle'); if (toc) toc.hidden = true;
				['mdCopy', 'mdDownload'].forEach(function(id) { var b = document.getElementById(id); if (b) b.hidden = true; });
			}
		} else {
			// calendar-date diff, so "D-1" flips at midnight, not at share-time+24h
			var now = new Date();
			var days = Math.round(
				(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
				 new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000
			);
			var count = days <= 0 ? (ko ? '오늘 만료' : 'expires today') : 'D-' + days;
			text.textContent = (ko ? dateStr + ' 만료 · ' : 'Expires ' + dateStr + ' · ') + count;
			if (days <= 3) badge.classList.add('b-soon');
		}
		badge.hidden = false;
	}
	render();
	// keep honest across long-lived tabs (midnight rollover)
	setInterval(render, 60 * 60 * 1000);
})();
</script>

${PANELS_SCRIPT}
${kind === 'canvas' ? CANVAS_SCRIPT : ''}
${kind === 'base' ? BASE_SCRIPT : ''}
</body>
</html>`;
}

// Pan / zoom viewer for shared canvases. Drag to pan; Ctrl/⌘ + wheel or
// trackpad pinch to zoom (plain wheel keeps scrolling the page, except in
// fullscreen); two-finger pinch on touch screens.
/**
 * Base tables: Fit/Wrap toggle, drag-to-resize columns (double-click a grip
 * to reset), click a row to expand it. Layout choices persist per page.
 */
const BASE_SCRIPT = `
<script>
(function() {
	var KEY = 'cmds-base:' + location.pathname;
	var saved = {};
	try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
	function save() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

	function sizeTable(table, widths) {
		var cols = table.querySelector('colgroup');
		if (!cols) { cols = document.createElement('colgroup'); table.insertBefore(cols, table.firstChild); }
		cols.innerHTML = '';
		var total = 0;
		widths.forEach(function(w) {
			var col = document.createElement('col');
			col.style.width = w + 'px';
			cols.appendChild(col);
			total += w;
		});
		table.style.width = total + 'px';
		table.classList.add('is-sized');
	}
	function unsizeTable(table) {
		var cols = table.querySelector('colgroup');
		if (cols) cols.remove();
		table.style.width = '';
		table.classList.remove('is-sized');
	}
	function measure(table) {
		return Array.prototype.map.call(table.querySelectorAll('thead th'), function(th) {
			return Math.round(th.getBoundingClientRect().width);
		});
	}

	function setupTable(table, key, onChange) {
		var ths = table.querySelectorAll('thead th');
		var preset = table.getAttribute('data-sizes');
		if (saved[key] && saved[key].length === ths.length) sizeTable(table, saved[key]);
		else if (preset) {
			// widths saved in the .base file; columns without one keep their fitted width
			try {
				var p = JSON.parse(preset), m = measure(table);
				if (p.length === ths.length) sizeTable(table, p.map(function(w, i) { return w || m[i]; }));
			} catch (e) {}
		}

		Array.prototype.forEach.call(ths, function(th, i) {
			var label = th.textContent;
			th.textContent = '';
			var inner = document.createElement('span');
			inner.className = 'cmds-th-inner';
			inner.textContent = label;
			th.title = label;
			th.appendChild(inner);
			var grip = document.createElement('span');
			grip.className = 'cmds-col-grip';
			grip.setAttribute('aria-hidden', 'true');
			th.appendChild(grip);
			grip.addEventListener('click', function(e) { e.stopPropagation(); });
			grip.addEventListener('dblclick', function(e) {
				e.stopPropagation();
				unsizeTable(table);
				delete saved[key]; save(); onChange();
			});
			grip.addEventListener('pointerdown', function(e) {
				e.preventDefault(); e.stopPropagation();
				var widths = table.classList.contains('is-sized') ? measureCols(table) : measure(table);
				sizeTable(table, widths);
				var startX = e.clientX, start = widths[i];
				grip.classList.add('dragging');
				try { grip.setPointerCapture(e.pointerId); } catch (err) {}
				function move(ev) {
					widths[i] = Math.max(48, Math.round(start + ev.clientX - startX));
					sizeTable(table, widths);
				}
				function up() {
					grip.classList.remove('dragging');
					grip.removeEventListener('pointermove', move);
					grip.removeEventListener('pointerup', up);
					grip.removeEventListener('pointercancel', up);
					saved[key] = widths.slice(); save(); onChange();
				}
				grip.addEventListener('pointermove', move);
				grip.addEventListener('pointerup', up);
				grip.addEventListener('pointercancel', up);
			});
		});

		// full value on hover when the cell is truncated; click a row to expand it
		Array.prototype.forEach.call(table.querySelectorAll('tbody td:not(.cmds-base-group-cell)'), function(td) {
			var t = (td.textContent || '').trim();
			if (t.length > 24) td.title = t;
		});
		table.addEventListener('click', function(e) {
			if (e.target.closest('a')) return;
			var tr = e.target.closest('tbody tr');
			if (tr && !tr.classList.contains('cmds-base-group-row')) tr.classList.toggle('is-expanded');
		});
	}
	function measureCols(table) {
		return Array.prototype.map.call(table.querySelectorAll('colgroup col'), function(c) { return parseInt(c.style.width, 10) || 120; });
	}

	function setupSection(section, si) {
		var root = section.querySelector('.cmds-base-view');
		if (!root) return;
		var tables = root.querySelectorAll('table.cmds-base-table');
		var count = root.querySelector(':scope > .cmds-base-count');
		var bar = document.createElement('div');
		bar.className = 'cmds-base-bar';
		root.insertBefore(bar, root.firstChild);
		if (count) bar.appendChild(count);
		if (!tables.length) return;

		var tools = document.createElement('div');
		tools.className = 'cmds-base-tools';
		function btn(text, title) {
			var b = document.createElement('button');
			b.type = 'button'; b.textContent = text; b.title = title;
			tools.appendChild(b);
			return b;
		}
		var fitBtn = btn('Fit', 'One line per row, columns sized to content');
		var wrapBtn = btn('Wrap', 'Wrap long values');
		var resetBtn = btn('Reset widths', 'Undo column resizing');
		bar.appendChild(tools);

		var wrapKey = 'wrap' + si;
		function paint() {
			var wrap = !!saved[wrapKey];
			root.classList.toggle('is-wrap', wrap);
			fitBtn.classList.toggle('on', !wrap);
			wrapBtn.classList.toggle('on', wrap);
			resetBtn.hidden = !root.querySelector('table.is-sized');
		}
		fitBtn.addEventListener('click', function() { delete saved[wrapKey]; save(); paint(); });
		wrapBtn.addEventListener('click', function() { saved[wrapKey] = 1; save(); paint(); });
		resetBtn.addEventListener('click', function() {
			Array.prototype.forEach.call(tables, function(t, ti) { unsizeTable(t); delete saved['w' + si + '-' + ti]; });
			save(); paint();
		});
		Array.prototype.forEach.call(tables, function(t, ti) { setupTable(t, 'w' + si + '-' + ti, paint); });
		paint();
	}

	function init() {
		Array.prototype.forEach.call(document.querySelectorAll('#note-content .cmds-base-section'), setupSection);
	}
	if (document.getElementById('encrypted-data') && !window.__cmdsReady) {
		document.addEventListener('cmds-content-ready', init, { once: true });
	} else {
		init();
	}
})();
</script>
`;

const CANVAS_SCRIPT = `
<script>
(function() {
	var ICONS = {
		minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
		plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
		fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/></svg>',
		full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
	};

	function setup(root) {
		var world = root.querySelector('.cmds-canvas-world');
		if (!world) return;
		var W = +root.getAttribute('data-w') || 1, H = +root.getAttribute('data-h') || 1;
		var s = 1, tx = 0, ty = 0;
		var ko = document.documentElement.lang === 'ko';

		function apply() { world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')'; }
		function fit() {
			var r = root.getBoundingClientRect();
			s = Math.min(r.width / W, r.height / H, 1.2);
			tx = (r.width - W * s) / 2; ty = (r.height - H * s) / 2;
			apply();
		}
		function zoomAt(factor, cx, cy) {
			var ns = Math.min(4, Math.max(0.08, s * factor));
			tx = cx - (cx - tx) * (ns / s); ty = cy - (cy - ty) * (ns / s); s = ns;
			apply();
		}
		function center() { var r = root.getBoundingClientRect(); return [r.width / 2, r.height / 2]; }

		// size the viewport to the board's aspect ratio (within limits)
		var width = root.getBoundingClientRect().width || 800;
		root.style.height = Math.max(320, Math.min(window.innerHeight * 0.78, H * Math.min(width / W, 1) + 24)) + 'px';

		var ui = document.createElement('div');
		ui.className = 'cmds-canvas-ui';
		[['minus', ko ? '축소' : 'Zoom out', function() { var c = center(); zoomAt(1 / 1.25, c[0], c[1]); }],
		 ['plus', ko ? '확대' : 'Zoom in', function() { var c = center(); zoomAt(1.25, c[0], c[1]); }],
		 ['fit', ko ? '화면에 맞추기' : 'Fit to view', fit],
		 ['full', ko ? '전체 화면' : 'Fullscreen', function() {
			if (document.fullscreenElement) document.exitFullscreen();
			else if (root.requestFullscreen) root.requestFullscreen();
		 }]].forEach(function(b) {
			var btn = document.createElement('button');
			btn.type = 'button'; btn.innerHTML = ICONS[b[0]]; btn.title = b[1]; btn.setAttribute('aria-label', b[1]);
			btn.addEventListener('click', function(e) { e.stopPropagation(); b[2](); });
			btn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
			ui.appendChild(btn);
		});
		root.appendChild(ui);
		var hint = document.createElement('div');
		hint.className = 'cmds-canvas-hint';
		hint.textContent = ko ? '드래그로 이동 · Ctrl/⌘ + 스크롤로 확대' : 'Drag to pan · Ctrl/⌘ + scroll to zoom';
		root.appendChild(hint);

		root.addEventListener('wheel', function(e) {
			var r = root.getBoundingClientRect();
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
			} else if (document.fullscreenElement === root) {
				e.preventDefault();
				tx -= e.deltaX; ty -= e.deltaY; apply();
			}
		}, { passive: false });

		var pointers = {}, last = null, pinch = null;
		root.addEventListener('pointerdown', function(e) {
			// let text selection, links, and scrolling work inside cards
			if (e.target.closest('.cv-body, a')) return;
			pointers[e.pointerId] = [e.clientX, e.clientY];
			root.setPointerCapture(e.pointerId);
			root.classList.add('dragging');
			last = [e.clientX, e.clientY];
			hint.style.display = 'none';
		});
		root.addEventListener('pointermove', function(e) {
			if (!pointers[e.pointerId]) return;
			pointers[e.pointerId] = [e.clientX, e.clientY];
			var ids = Object.keys(pointers);
			if (ids.length === 2) {
				var a = pointers[ids[0]], b = pointers[ids[1]];
				var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
				var r = root.getBoundingClientRect();
				if (pinch) zoomAt(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
				pinch = d;
				return;
			}
			if (last) { tx += e.clientX - last[0]; ty += e.clientY - last[1]; apply(); }
			last = [e.clientX, e.clientY];
		});
		function up(e) {
			delete pointers[e.pointerId];
			pinch = null;
			var ids = Object.keys(pointers);
			last = ids.length ? pointers[ids[0]] : null;
			if (!ids.length) root.classList.remove('dragging');
		}
		root.addEventListener('pointerup', up);
		root.addEventListener('pointercancel', up);
		document.addEventListener('fullscreenchange', function() { requestAnimationFrame(fit); });
		window.addEventListener('resize', function() { requestAnimationFrame(fit); });
		fit();
	}

	function init() { document.querySelectorAll('#note-content .cmds-canvas').forEach(setup); }
	if (document.getElementById('encrypted-data') && !window.__cmdsReady) {
		document.addEventListener('cmds-content-ready', init, { once: true });
	} else {
		init();
	}
})();
</script>
`;

const DECRYPTION_SCRIPT = `
<script>
(async function() {
	function base64ToBytes(b64) {
		const bin = atob(b64); const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return bytes;
	}
	// The key travels URL-fragment-safe (base64url, no padding) — restore standard base64
	function keyToBytes(key) {
		let b64 = key.replace(/-/g, '+').replace(/_/g, '/');
		while (b64.length % 4) b64 += '=';
		return base64ToBytes(b64);
	}
	function indexToIv(i) {
		const iv = new Uint8Array(12);
		new DataView(iv.buffer).setUint32(0, i, true);
		return iv;
	}
	try {
		const key = window.location.hash.slice(1);
		if (!key) throw new Error('No decryption key in URL');
		const dataEl = document.getElementById('encrypted-data');
		if (!dataEl) throw new Error('No encrypted payload');

		const payload = JSON.parse(dataEl.textContent);
		const aesKey = await crypto.subtle.importKey('raw', keyToBytes(key), { name: 'AES-GCM' }, false, ['decrypt']);

		// chunks are byte slices of one UTF-8 stream: concatenate bytes FIRST, decode once
		const parts = [];
		let total = 0;
		for (let i = 0; i < payload.ciphertext.length; i++) {
			const chunk = base64ToBytes(payload.ciphertext[i]);
			const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: indexToIv(i) }, aesKey, chunk));
			parts.push(decrypted);
			total += decrypted.length;
		}
		const all = new Uint8Array(total);
		let offset = 0;
		for (const part of parts) { all.set(part, offset); offset += part.length; }

		const data = JSON.parse(new TextDecoder().decode(all));
		const target = document.getElementById('note-content');
		target.innerHTML = data.content;
		if (data.title) document.title = data.title;
		if (data.markdown != null) window.__cmdsMd = data.markdown;
		// flag + event: later scripts may execute AFTER decryption already
		// finished (tiny payloads decrypt within microtask checkpoints), so
		// waiters must check the flag before subscribing
		window.__cmdsReady = true;
		document.dispatchEvent(new Event('cmds-content-ready'));
	} catch (err) {
		console.error('Decryption failed:', err);
		const target = document.getElementById('note-content');
		const ko = document.documentElement.lang === 'ko';
		const noKey = !window.location.hash.slice(1);
		const msg = noKey
			? (ko
				? '이 노트는 종단간 암호화되어 있습니다. 주소 뒤 <code>#키</code>까지 포함된 전체 링크로 열어야 내용이 보입니다. 서버에는 키가 없어 대시보드 링크로는 열 수 없습니다.'
				: 'This note is end-to-end encrypted. Open the complete link including the <code>#key</code> fragment — the server never has the key, so dashboard links cannot open it.')
			: (ko
				? '복호화에 실패했습니다. 링크의 <code>#키</code>가 정확한지 확인하세요. 노트를 다시 공유하면 키가 바뀌므로 이전 링크는 더 이상 열리지 않습니다.'
				: 'Failed to decrypt. Check the <code>#key</code> in the link — re-sharing a note rotates the key, so older links stop working.');
		if (target) target.innerHTML = '<div class="decrypt-error">' + msg + '</div>';
	}
})();
</script>
`;

// TOC + local-graph side panels. Two modes: floating popup and docked flex
// sidebar (TOC scrolls on top, graph fills the rest). The graph is interactive:
// wheel/pinch zoom, drag pan, hover highlights the node's neighborhood.
const PANELS_SCRIPT = `
<script>
(function() {
	var PANELS = { toc: 'tocPanel', graph: 'graphPanel' };
	var hasToc = false, hasGraph = false;

	function docked() { return document.body.classList.contains('cmds-docked'); }

	function setPanel(name, open) {
		Object.keys(PANELS).forEach(function(k) {
			var on = k === name ? open : false;
			document.getElementById(PANELS[k]).classList.toggle('open', on);
			document.getElementById(k + 'Toggle').classList.toggle('active', on);
			try { localStorage.setItem('cmds-panel-' + k, on ? '1' : '0'); } catch(e) {}
		});
		if (name === 'graph' && open) requestAnimationFrame(function() { relayoutGraph(); });
	}
	function wireToggle(name) {
		document.getElementById(name + 'Toggle').addEventListener('click', function() {
			var isOpen = document.getElementById(PANELS[name]).classList.contains('open');
			setPanel(name, !isOpen);
		});
	}

	function setDock(on) {
		if (on && window.innerWidth <= 1100) on = false;
		var dock = document.getElementById('sideDock');
		var toc = document.getElementById('tocPanel');
		var graph = document.getElementById('graphPanel');
		document.body.classList.toggle('cmds-docked', on);
		if (on) {
			Object.keys(PANELS).forEach(function(k) {
				document.getElementById(PANELS[k]).classList.remove('open');
				document.getElementById(k + 'Toggle').classList.remove('active');
			});
			if (hasToc) dock.appendChild(toc);
			if (hasGraph) dock.appendChild(graph);
			dock.hidden = false;
		} else {
			dock.hidden = true;
			document.body.appendChild(toc);
			document.body.appendChild(graph);
		}
		try { localStorage.setItem('cmds-dock', on ? '1' : '0'); } catch(e) {}
		if (hasGraph) requestAnimationFrame(function() { relayoutGraph(); });
	}

	function headings() {
		// headings inside canvas cards are card content, not document structure
		return Array.prototype.filter.call(
			document.querySelectorAll('#note-content h1, #note-content h2, #note-content h3, #note-content h4'),
			function(h) { return !h.closest('.cmds-canvas'); }
		);
	}

	function assignHeadingIds() {
		var used = {};
		headings().forEach(function(h) {
			var text = (h.textContent || '').trim();
			if (!text || h.id) return;
			var slug = text.toLowerCase().replace(/[^0-9a-z\\uAC00-\\uD7A3\\u3131-\\u318E\\s-]/g, '').replace(/\\s+/g, '-') || 'section';
			if (used[slug] != null) { used[slug]++; slug = slug + '-' + used[slug]; } else { used[slug] = 0; }
			h.id = slug;
		});
	}

	function buildToc() {
		var list = document.getElementById('tocList');
		list.innerHTML = '';
		headings().forEach(function(h) {
			var text = (h.textContent || '').trim();
			if (!text || !h.id) return;
			var a = document.createElement('a');
			a.href = '#' + h.id;
			a.textContent = text;
			a.className = 'toc-' + h.tagName.toLowerCase();
			a.title = text;
			list.appendChild(a);
		});
		return list.children.length >= 2;
	}

	// highlight the section currently in view (and keep it visible in a scrolling TOC)
	function scrollSpy() {
		var links = document.querySelectorAll('#tocList a');
		if (!links.length) return;
		var map = {};
		links.forEach(function(a) { map[decodeURIComponent(a.hash.slice(1))] = a; });
		var obs = new IntersectionObserver(function(entries) {
			entries.forEach(function(en) {
				if (!en.isIntersecting) return;
				links.forEach(function(a) { a.classList.remove('active'); });
				var a = map[en.target.id];
				if (a) {
					a.classList.add('active');
					if (a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
				}
			});
		}, { rootMargin: '0px 0px -75% 0px' });
		headings().forEach(function(h) { if (h.id) obs.observe(h); });
	}

	var ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5"/></svg>';
	var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
	var ICON_LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

	function enhanceCodeBlocks() {
		document.querySelectorAll('#note-content pre').forEach(function(pre) {
			if (pre.querySelector('.code-copy')) return;
			var code = pre.querySelector('code');
			var langMatch = ((code ? code.className : '') + ' ' + pre.className).match(/language-([a-z0-9+#-]+)/i);
			if (langMatch && langMatch[1] !== 'undefined') pre.setAttribute('data-lang', langMatch[1]);
			var btn = document.createElement('button');
			btn.className = 'code-copy';
			btn.setAttribute('aria-label', 'Copy code');
			btn.innerHTML = ICON_COPY;
			btn.addEventListener('click', function() {
				var code = pre.querySelector('code');
				var textToCopy = (code || pre).innerText.replace(/\\n$/, '');
				navigator.clipboard.writeText(textToCopy).then(function() {
					btn.innerHTML = ICON_CHECK;
					btn.classList.add('copied');
					setTimeout(function() { btn.innerHTML = ICON_COPY; btn.classList.remove('copied'); }, 1500);
				});
			});
			pre.appendChild(btn);
		});
	}

	// foldable callouts ("> [!tip]-") render collapsed with inline display:none
	function foldableCallouts() {
		document.querySelectorAll('#note-content .callout.is-collapsible > .callout-title').forEach(function(title) {
			if (title.dataset.cmdsFold) return;
			title.dataset.cmdsFold = '1';
			title.addEventListener('click', function() {
				var callout = title.parentElement;
				var content = callout.querySelector(':scope > .callout-content');
				var collapsed = callout.classList.toggle('is-collapsed');
				if (content) content.style.display = collapsed ? 'none' : '';
				var fold = title.querySelector('.callout-fold');
				if (fold) fold.classList.toggle('is-collapsed', collapsed);
			});
		});
	}

	// hover link icon on headings — click copies the deep link
	function headingAnchors() {
		headings().forEach(function(h) {
			if (!h.id || h.querySelector('.h-anchor')) return;
			var a = document.createElement('a');
			a.className = 'h-anchor';
			a.href = '#' + h.id;
			a.setAttribute('aria-label', 'Copy link to section');
			a.innerHTML = ICON_LINK;
			a.addEventListener('click', function(e) {
				e.preventDefault();
				history.replaceState(null, '', '#' + h.id);
				try { navigator.clipboard.writeText(location.href.split('#')[0] + '#' + h.id); } catch(err) {}
				h.scrollIntoView({ behavior: 'smooth' });
			});
			h.appendChild(a);
		});
	}

	// ══════════ markdown source tools (copy / download) ══════════
	function mdSource() {
		if (window.__cmdsMd != null) return window.__cmdsMd; // decrypted payload
		var el = document.getElementById('md-source');
		if (!el) return null;
		try {
			var bin = atob(el.textContent.trim());
			var bytes = new Uint8Array(bin.length);
			for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			return new TextDecoder().decode(bytes);
		} catch(e) { return null; }
	}

	function wireMdTools() {
		var md = mdSource();
		if (md == null) return;
		var copyBtn = document.getElementById('mdCopy');
		var dlBtn = document.getElementById('mdDownload');
		if (copyBtn) {
			copyBtn.hidden = false;
			var idle = copyBtn.innerHTML;
			copyBtn.addEventListener('click', function() {
				navigator.clipboard.writeText(md).then(function() {
					copyBtn.innerHTML = ICON_CHECK;
					copyBtn.classList.add('active');
					setTimeout(function() { copyBtn.innerHTML = idle; copyBtn.classList.remove('active'); }, 1500);
				});
			});
		}
		if (dlBtn) {
			dlBtn.hidden = false;
			dlBtn.addEventListener('click', function() {
				var name = (document.title || 'note').replace(/[\\\\/:*?"<>|]/g, '-').trim() || 'note';
				var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
				var url = URL.createObjectURL(blob);
				var a = document.createElement('a');
				a.href = url;
				a.download = name + '.md';
				document.body.appendChild(a);
				a.click();
				a.remove();
				setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
			});
		}
	}

	// ══════════ interactive force-directed local graph ══════════
	var G = null; // { data, pts, adj, deg, W, H, k, tx, ty, hover }

	function readGraphData() {
		var dataEl = document.getElementById('graph-data');
		if (!dataEl) return null;
		var g;
		try { g = JSON.parse(dataEl.textContent); } catch(e) { return null; }
		if (!g.nodes || g.nodes.length < 2) return null;
		return g;
	}

	function runLayout(g, W, H) {
		var N = g.nodes.length;
		var pts = g.nodes.map(function(n, i) {
			var a = i * 2.399963;
			var r = n.level === 0 ? 0 : (n.level === 1 ? 0.35 : 0.7) * Math.min(W, H) / 2;
			return { x: W / 2 + r * Math.cos(a), y: H / 2 + r * Math.sin(a), vx: 0, vy: 0 };
		});
		var SPRING = 0.03, REST = Math.min(W, H) / 3.2, REPEL = Math.min(W, H) * 55, GRAV = 0.008;
		for (var it = 0; it < 300; it++) {
			var damp = 0.85 * (1 - it / 340);
			for (var i = 0; i < N; i++) {
				for (var j = i + 1; j < N; j++) {
					var dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
					var d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2);
					var f = Math.min(REPEL / d2, 8);
					var fx = (dx / d) * f, fy = (dy / d) * f;
					pts[i].vx -= fx; pts[i].vy -= fy;
					pts[j].vx += fx; pts[j].vy += fy;
				}
			}
			g.edges.forEach(function(e) {
				var a = pts[e[0]], b = pts[e[1]];
				var dx = b.x - a.x, dy = b.y - a.y;
				var d = Math.sqrt(dx * dx + dy * dy) + 0.01;
				var f = SPRING * (d - REST);
				var fx = (dx / d) * f, fy = (dy / d) * f;
				a.vx += fx; a.vy += fy;
				b.vx -= fx; b.vy -= fy;
			});
			for (var k2 = 0; k2 < N; k2++) {
				pts[k2].vx += (W / 2 - pts[k2].x) * GRAV;
				pts[k2].vy += (H / 2 - pts[k2].y) * GRAV;
				pts[k2].x += pts[k2].vx * damp;
				pts[k2].y += pts[k2].vy * damp;
				pts[k2].vx *= 0.6; pts[k2].vy *= 0.6;
			}
			pts[0].x = W / 2; pts[0].y = H / 2; pts[0].vx = 0; pts[0].vy = 0;
		}
		var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
		pts.forEach(function(pt) {
			minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
			minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
		});
		var M = 30;
		var sx = (W - M * 2) / Math.max(maxX - minX, 1), sy = (H - M * 2) / Math.max(maxY - minY, 1);
		var sc = Math.min(sx, sy, 1.5);
		pts.forEach(function(pt) {
			pt.x = M + (pt.x - minX) * sc + (W - M * 2 - (maxX - minX) * sc) / 2;
			pt.y = M + (pt.y - minY) * sc + (H - M * 2 - (maxY - minY) * sc) / 2;
		});
		return pts;
	}

	function canvasSize() {
		var canvas = document.getElementById('graphCanvas');
		var panel = document.getElementById('graphPanel');
		var wasHidden = !panel.classList.contains('open') && !docked();
		if (wasHidden) { panel.style.visibility = 'hidden'; panel.classList.add('open'); }
		var W = Math.max(canvas.clientWidth || panel.clientWidth - 36, 200);
		var H = docked() ? Math.max(canvas.clientHeight, 200) : 280;
		if (wasHidden) { panel.classList.remove('open'); panel.style.visibility = ''; }
		return { W: W, H: H };
	}

	function relayoutGraph() {
		var data = G ? G.data : readGraphData();
		if (!data) return;
		var sz = canvasSize();
		var adj = data.nodes.map(function() { return {}; });
		var deg = data.nodes.map(function() { return 0; });
		data.edges.forEach(function(e) {
			adj[e[0]][e[1]] = true; adj[e[1]][e[0]] = true;
			deg[e[0]]++; deg[e[1]]++;
		});
		G = {
			data: data, adj: adj, deg: deg,
			pts: runLayout(data, sz.W, sz.H),
			W: sz.W, H: sz.H, k: 1, tx: 0, ty: 0, hover: -1,
		};
		renderGraph();
	}

	function renderGraph() {
		if (!G) return;
		var canvas = document.getElementById('graphCanvas');
		var dpr = window.devicePixelRatio || 1;
		canvas.width = G.W * dpr; canvas.height = G.H * dpr;
		if (!docked()) canvas.style.height = G.H + 'px';
		var ctx = canvas.getContext('2d');
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, G.W, G.H);

		var css = getComputedStyle(document.documentElement);
		var noteColor = css.getPropertyValue('--graph-note').trim() || css.getPropertyValue('--accent').trim();
		var muted = css.getPropertyValue('--muted').trim();
		var text = css.getPropertyValue('--text').trim();
		var border = css.getPropertyValue('--border').trim();
		var cardBg = css.getPropertyValue('--card-bg').trim();

		var g = G.data, pts = G.pts, k = G.k, hover = G.hover;
		var sx = function(pt) { return pt.x * k + G.tx; };
		var sy = function(pt) { return pt.y * k + G.ty; };
		var inHood = function(i) { return hover < 0 || i === hover || G.adj[hover][i]; };

		g.edges.forEach(function(e) {
			var touches = hover >= 0 && (e[0] === hover || e[1] === hover);
			if (hover >= 0) {
				ctx.globalAlpha = touches ? 0.95 : 0.08;
				ctx.strokeStyle = touches ? muted : border;
				ctx.lineWidth = touches ? 1.5 : 1;
			} else {
				ctx.globalAlpha = (g.nodes[e[0]].level === 2 || g.nodes[e[1]].level === 2) ? 0.45 : 0.8;
				ctx.strokeStyle = border;
				ctx.lineWidth = 1;
			}
			ctx.beginPath();
			ctx.moveTo(sx(pts[e[0]]), sy(pts[e[0]]));
			ctx.lineTo(sx(pts[e[1]]), sy(pts[e[1]]));
			ctx.stroke();
		});

		var rOf = function(i) {
			var base = i === 0 ? 7 : Math.min(3.2 + G.deg[i] * 0.6, 6.5);
			return base * Math.pow(k, 0.75);
		};
		g.nodes.forEach(function(n, i) {
			var dim = hover >= 0 ? (inHood(i) ? 1 : 0.14) : (n.level === 2 ? 0.65 : 1);
			ctx.globalAlpha = dim;
			ctx.fillStyle = n.type === 'tag' ? '#E985A2' : noteColor;
			ctx.beginPath(); ctx.arc(sx(pts[i]), sy(pts[i]), rOf(i), 0, Math.PI * 2); ctx.fill();
			if (i === hover) {
				ctx.strokeStyle = text; ctx.lineWidth = 1.5;
				ctx.beginPath(); ctx.arc(sx(pts[i]), sy(pts[i]), rOf(i) + 2.5, 0, Math.PI * 2); ctx.stroke();
			}
		});

		// labels: center always; L1 at normal zoom; everything once zoomed in;
		// hovering shows the whole neighborhood regardless of zoom
		g.nodes.forEach(function(n, i) {
			var show;
			if (hover >= 0) show = inHood(i);
			else show = i === 0 || (n.level === 1 && (k >= 1.05 || g.nodes.length <= 20)) || k >= 1.9 || g.nodes.length <= 12;
			if (!show) return;
			var fs = i === 0 || i === hover ? 11.5 : 10.5;
			ctx.font = (i === 0 || i === hover ? 'bold ' : '') + fs + 'px -apple-system, sans-serif';
			var label = n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label;
			var tw = ctx.measureText(label).width;
			var lx = Math.max(2, Math.min(G.W - tw - 2, sx(pts[i]) - tw / 2));
			var ly = sy(pts[i]) + rOf(i) + fs + 2;
			var alpha = hover >= 0 ? (inHood(i) ? 1 : 0) : (n.level === 2 && k < 2 ? 0.7 : 0.95);
			ctx.globalAlpha = alpha * 0.8;
			ctx.fillStyle = cardBg;
			ctx.fillRect(lx - 3, ly - fs + 1, tw + 6, fs + 3);
			ctx.globalAlpha = alpha;
			ctx.fillStyle = i === 0 || i === hover ? text : muted;
			ctx.fillText(label, lx, ly);
		});
		ctx.globalAlpha = 1;
	}

	function zoomBy(factor) {
		if (!G) return;
		var mx = G.W / 2, my = G.H / 2;
		var nk = Math.max(0.35, Math.min(4.5, G.k * factor));
		factor = nk / G.k;
		G.tx = mx - (mx - G.tx) * factor;
		G.ty = my - (my - G.ty) * factor;
		G.k = nk;
		renderGraph();
	}

	function wireGraphInteraction() {
		var canvas = document.getElementById('graphCanvas');
		var dragging = false, moved = false, lastX = 0, lastY = 0;

		document.getElementById('gZoomIn').addEventListener('click', function() { zoomBy(1.35); });
		document.getElementById('gZoomOut').addEventListener('click', function() { zoomBy(1 / 1.35); });
		document.getElementById('gReset').addEventListener('click', function() {
			if (G) { G.k = 1; G.tx = 0; G.ty = 0; renderGraph(); }
		});

		function pick(mx, my) {
			if (!G) return -1;
			var best = -1, bestD = 12 * 12;
			G.pts.forEach(function(pt, i) {
				var dx = pt.x * G.k + G.tx - mx, dy = pt.y * G.k + G.ty - my;
				var d = dx * dx + dy * dy;
				if (d < bestD) { bestD = d; best = i; }
			});
			return best;
		}
		function pos(e) {
			var r = canvas.getBoundingClientRect();
			return { x: e.clientX - r.left, y: e.clientY - r.top };
		}

		canvas.addEventListener('wheel', function(e) {
			if (!G) return;
			e.preventDefault();
			var m = pos(e);
			var factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
			var nk = Math.max(0.35, Math.min(4.5, G.k * factor));
			factor = nk / G.k;
			G.tx = m.x - (m.x - G.tx) * factor;
			G.ty = m.y - (m.y - G.ty) * factor;
			G.k = nk;
			renderGraph();
		}, { passive: false });

		canvas.addEventListener('pointerdown', function(e) {
			if (!G) return;
			dragging = true; moved = false;
			lastX = e.clientX; lastY = e.clientY;
			canvas.classList.add('dragging');
			canvas.setPointerCapture(e.pointerId);
		});
		canvas.addEventListener('pointermove', function(e) {
			if (!G) return;
			if (dragging) {
				var dx = e.clientX - lastX, dy = e.clientY - lastY;
				if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
				G.tx += dx; G.ty += dy;
				lastX = e.clientX; lastY = e.clientY;
				renderGraph();
			} else {
				var m = pos(e);
				var h = pick(m.x, m.y);
				canvas.classList.toggle('on-node', h >= 0);
				if (h !== G.hover) { G.hover = h; renderGraph(); }
			}
		});
		canvas.addEventListener('pointerup', function(e) {
			dragging = false;
			canvas.classList.remove('dragging');
			// double-click-ish: a clean click on empty space resets the view
			if (!moved) {
				var m = pos(e);
				if (pick(m.x, m.y) < 0 && G.k !== 1) { G.k = 1; G.tx = 0; G.ty = 0; renderGraph(); }
			}
		});
		canvas.addEventListener('pointerleave', function() {
			if (G && G.hover !== -1) { G.hover = -1; renderGraph(); }
			canvas.classList.remove('on-node');
		});
	}

	function init() {
		// start from a known-clean panel state before restoring preferences
		document.body.classList.remove('cmds-docked');
		document.getElementById('sideDock').hidden = true;
		assignHeadingIds();
		enhanceCodeBlocks();
		headingAnchors();
		foldableCallouts();
		wireMdTools();
		hasToc = buildToc();
		if (hasToc) {
			document.getElementById('tocToggle').hidden = false;
			wireToggle('toc');
			scrollSpy();
		}
		hasGraph = !!readGraphData();
		if (hasGraph) {
			document.getElementById('graphToggle').hidden = false;
			wireToggle('graph');
			wireGraphInteraction();
			new MutationObserver(function() { renderGraph(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
			window.addEventListener('resize', function() {
				if (docked() && window.innerWidth <= 1100) { setDock(false); return; }
				if (docked()) requestAnimationFrame(function() { relayoutGraph(); });
			});
		}
		if (hasToc || hasGraph) {
			document.querySelectorAll('[data-pin]').forEach(function(btn) {
				btn.addEventListener('click', function() { setDock(!docked()); });
			});
			// floating popups close on any click outside the card (docked stays put)
			document.addEventListener('pointerdown', function(e) {
				if (docked()) return;
				if (e.target.closest('.side-panel, .side-tools')) return;
				Object.keys(PANELS).forEach(function(k) {
					if (document.getElementById(PANELS[k]).classList.contains('open')) setPanel(k, false);
				});
			});
		}
		try {
			if (localStorage.getItem('cmds-dock') === '1' && (hasToc || hasGraph)) {
				setDock(true);
			} else if (localStorage.getItem('cmds-panel-toc') === '1' && hasToc) setPanel('toc', true);
			else if (localStorage.getItem('cmds-panel-graph') === '1' && hasGraph) setPanel('graph', true);
		} catch(e) {}
	}

	if (document.getElementById('encrypted-data') && !window.__cmdsReady) {
		document.addEventListener('cmds-content-ready', init, { once: true });
	} else {
		init();
	}
})();
</script>
`;

function escapeHtml(text: string): string {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeAttr(text: string): string {
	return String(text).replace(/"/g, '&quot;');
}

function escapeJson(text: string): string {
	return String(text).replace(/<\/script/gi, '<\\/script');
}

function textToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}
