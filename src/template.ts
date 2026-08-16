import { NoteTemplateData, ShareTheme, ThemePalette, ThemeVars } from './types';

const LOGO_URL = 'https://cmdspace.work/assets/logos/cmds-logo-round.png';
const OG_IMAGE_URL = 'https://share.cmdspace.work/assets/og/og-share.png';

/** Built-in share-page palettes. 'obsidian' is resolved at share time in api.ts. */
export const PALETTES: Record<Exclude<ShareTheme, 'obsidian'>, ThemePalette> = {
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
		palette,
		themeName,
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

	const decryptionScript = encrypted ? DECRYPTION_SCRIPT : '';

	const bodyContent = encrypted
		? '<article id="note-content" class="markdown-rendered"><p class="cmds-loading">Decrypting…</p></article>'
		: `<article id="note-content" class="markdown-rendered">${content}</article>`;

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
(function(){try{var t=localStorage.getItem('cmds-theme');if(t){document.documentElement.dataset.theme=t;}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}else{document.documentElement.dataset.theme='light';}}catch(e){}})();
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
	color: var(--text); background: var(--bg); line-height: 1.7;
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

#note-content { font-size: 1rem; overflow-wrap: break-word; }
#note-content h1, #note-content h2, #note-content h3,
#note-content h4, #note-content h5, #note-content h6 {
	font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;
	margin: 2rem 0 0.75rem; scroll-margin-top: 1.5rem;
}
#note-content h1 { font-size: 1.85rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--text); }
#note-content h2 { font-size: 1.4rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
#note-content h3 { font-size: 1.15rem; }
#note-content h4 { font-size: 1rem; color: var(--muted); }
#note-content p { margin: 0.75rem 0; }
#note-content ul, #note-content ol { margin: 0.75rem 0 0.75rem 1.5rem; }
#note-content li { margin: 0.25rem 0; }
#note-content a {
	color: var(--accent); text-decoration: none;
	border-bottom: 1px solid transparent; transition: border-color .15s;
}
#note-content a:hover { border-bottom-color: var(--accent); }
#note-content code {
	background: var(--code-bg); padding: 0.15rem 0.4rem; border-radius: 4px;
	font-size: 0.88em; font-family: 'SF Mono', 'Menlo', monospace;
}
#note-content pre {
	background: var(--pre-bg); color: var(--pre-fg);
	border: 1px solid var(--border);
	padding: 1rem; border-radius: 8px;
	overflow-x: auto; font-size: 0.85rem; line-height: 1.6;
	font-family: 'SF Mono', 'Menlo', monospace; margin: 1rem 0;
	position: relative;
}
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
#note-content pre code { background: transparent; padding: 0; font-size: 1em; }
.mermaid-container { margin: 1rem 0; overflow-x: auto; text-align: center; }
.mermaid-container svg { max-width: 100%; height: auto; }
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
	border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left;
}
#note-content th { background: var(--code-bg); font-weight: 700; }
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

.cmds-meta {
	max-width: var(--max); margin: 0 auto;
	padding: 2rem 1.5rem 2rem; border-top: 1px solid var(--border);
	font-size: 0.75rem; color: var(--muted); text-align: center;
	display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
}
.cmds-meta img { width: 28px; height: 28px; border-radius: 50%; }
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
</head>
<body>

<div class="side-tools">
	<button class="tool-btn" id="themeToggle" aria-label="Toggle theme">
		<svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
	</button>
	<button class="tool-btn" id="tocToggle" aria-label="Table of contents" hidden>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h10M4 18h13"/></svg>
	</button>
	<button class="tool-btn" id="graphToggle" aria-label="Local graph" hidden>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M10.8 6.9 6.2 16m7-9.1 4.6 9.1M7.2 18h9.6"/></svg>
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
	<a href="https://cmdspace.work" target="_blank" rel="noopener"><img src="${LOGO_URL}" alt="CMDSPACE"></a>
	<span>Shared via <a href="https://github.com/johnfkoo951/cmds-share" target="_blank" rel="noopener">CMDS Share</a></span>
	<span class="cmds-theme-note">Theme: ${escapeHtml(themeName)}</span>
	${footerLink ? `<a class="cmds-author-link" href="${escapeAttr(footerLink.url)}" target="_blank" rel="noopener">${escapeHtml(footerLink.label)}</a>` : ''}
</footer>

${encryptedDataDiv}
${graphDataDiv}
${decryptionScript}

<script type="module">
(async function() {
	// mermaid sources travel base64-encoded in data-mmd; render with the LATEST mermaid
	if (document.getElementById('encrypted-data')) {
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

${PANELS_SCRIPT}
</body>
</html>`;
}

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
		document.dispatchEvent(new Event('cmds-content-ready'));
	} catch (err) {
		console.error('Decryption failed:', err);
		const target = document.getElementById('note-content');
		if (target) target.innerHTML = '<div class="decrypt-error">Failed to decrypt note. Check the URL fragment.</div>';
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
		return document.querySelectorAll('#note-content h1, #note-content h2, #note-content h3, #note-content h4');
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

	if (document.getElementById('encrypted-data')) {
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
