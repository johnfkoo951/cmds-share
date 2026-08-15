import { NoteTemplateData } from './types';

const LOGO_URL = 'https://cmdspace.work/assets/logos/cmds-logo-round.png';
const OG_IMAGE_URL = 'https://share.cmdspace.work/assets/og/og-share.png';

// Dark palette is emitted twice: once for the JS toggle ([data-theme="dark"])
// and once as a pure-CSS fallback for JS-disabled visitors (prefers-color-scheme).
const DARK_VARS = `
	--text: #f2f4f3;
	--muted: #9aa39d;
	--bg: #06080a;
	--accent: #E985A2;
	--accent-light: #F4A4B8;
	--accent-on: #1a0f14;
	--border: #1a231f;
	--code-bg: #161c19;
	--card-bg: #0d1411;
	--pre-bg: #0a0d0b;
	--pre-fg: #e0e0e0;
`;

export function generateNoteHtml(data: NoteTemplateData): string {
	const {
		title,
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
	--text: #1a1a1a;
	--muted: #666;
	--bg: #fff;
	--accent: #134538;
	--accent-light: #1a5c4a;
	--accent-on: #fff;
	--border: #e5e5e5;
	--code-bg: #f5f5f5;
	--card-bg: #fff;
	--pre-bg: #f5f6f4;
	--pre-fg: #24292e;
}
[data-theme="dark"] {${DARK_VARS}}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {${DARK_VARS}}
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { color-scheme: light dark; scroll-behavior: smooth; }
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
.side-panel h3 {
	font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
	letter-spacing: 0.08em; color: var(--muted); margin-bottom: 0.6rem;
}
#tocList { display: flex; flex-direction: column; gap: 2px; }
#tocList a {
	color: var(--text); text-decoration: none; font-size: 0.82rem;
	line-height: 1.4; padding: 0.25rem 0.5rem; border-radius: 6px;
	display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#tocList a:hover { background: var(--code-bg); color: var(--accent); }
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
.graph-legend .lg-link::before { background: var(--accent); }
.graph-legend .lg-tag::before { background: #E985A2; }

main {
	max-width: var(--max); margin: 0 auto; padding: 4rem 1.5rem 3rem;
}

#note-content { font-size: 1rem; }
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
}
#note-content pre code { background: transparent; padding: 0; font-size: 1em; }
#note-content blockquote {
	border-left: 3px solid var(--accent); padding: 0.5rem 1rem;
	margin: 1rem 0; color: var(--muted); background: var(--code-bg);
	border-radius: 0 8px 8px 0;
}
#note-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
#note-content table {
	border-collapse: collapse; width: 100%; margin: 1rem 0;
	font-size: 0.9rem;
}
#note-content th, #note-content td {
	border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left;
}
#note-content th { background: var(--code-bg); font-weight: 700; }
#note-content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
#note-content mark { background: rgba(233,133,162,0.25); padding: 0 0.2rem; border-radius: 3px; }
#note-content .callout {
	background: var(--code-bg); border-radius: 8px; padding: 1rem;
	margin: 1rem 0; border-left: 3px solid var(--accent);
}
#note-content .callout-title { font-weight: 700; margin-bottom: 0.4rem; }
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

<aside class="side-panel" id="tocPanel"><h3>Contents</h3><nav id="tocList"></nav></aside>
<aside class="side-panel" id="graphPanel"><h3>Local Graph</h3><canvas id="graphCanvas"></canvas>
<div class="graph-legend"><span class="lg-link">Linked notes</span><span class="lg-tag">Tags</span></div></aside>

<main>
	${bodyContent}
</main>

<footer class="cmds-meta">
	<a href="https://cmdspace.work" target="_blank" rel="noopener"><img src="${LOGO_URL}" alt="CMDSPACE"></a>
	<span>Shared via <a href="https://cmdspace.work" target="_blank" rel="noopener">CMDS Share</a></span>
</footer>

${encryptedDataDiv}
${graphDataDiv}
${decryptionScript}

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

// TOC + local-graph side panels. Runs after content is in the DOM
// (immediately for plain shares; after 'cmds-content-ready' for encrypted ones).
const PANELS_SCRIPT = `
<script>
(function() {
	var PANELS = { toc: 'tocPanel', graph: 'graphPanel' };

	function setPanel(name, open) {
		Object.keys(PANELS).forEach(function(k) {
			var on = k === name ? open : false;
			document.getElementById(PANELS[k]).classList.toggle('open', on);
			document.getElementById(k + 'Toggle').classList.toggle('active', on);
			try { localStorage.setItem('cmds-panel-' + k, on ? '1' : '0'); } catch(e) {}
		});
	}
	function wireToggle(name) {
		document.getElementById(name + 'Toggle').addEventListener('click', function() {
			var isOpen = document.getElementById(PANELS[name]).classList.contains('open');
			setPanel(name, !isOpen);
		});
	}

	function buildToc() {
		var article = document.getElementById('note-content');
		var heads = article.querySelectorAll('h1, h2, h3, h4');
		if (heads.length < 2) return false;
		var list = document.getElementById('tocList');
		list.innerHTML = '';
		var used = {};
		heads.forEach(function(h) {
			var text = (h.textContent || '').trim();
			if (!text) return;
			var slug = text.toLowerCase().replace(/[^0-9a-z\\uAC00-\\uD7A3\\u3131-\\u318E\\s-]/g, '').replace(/\\s+/g, '-') || 'section';
			if (used[slug] != null) { used[slug]++; slug = slug + '-' + used[slug]; } else { used[slug] = 0; }
			if (!h.id) h.id = slug;
			var a = document.createElement('a');
			a.href = '#' + h.id;
			a.textContent = text;
			a.className = 'toc-' + h.tagName.toLowerCase();
			a.title = text;
			list.appendChild(a);
		});
		return list.children.length >= 2;
	}

	function drawGraph() {
		var canvas = document.getElementById('graphCanvas');
		var dataEl = document.getElementById('graph-data');
		if (!dataEl) return false;
		var g;
		try { g = JSON.parse(dataEl.textContent); } catch(e) { return false; }
		var nodes = (g.links || []).map(function(n) { return { label: n, type: 'link' }; })
			.concat((g.tags || []).map(function(n) { return { label: '#' + n, type: 'tag' }; }));
		if (nodes.length === 0) return false;

		var css = getComputedStyle(document.documentElement);
		var W = 246, H = Math.max(220, Math.min(340, 140 + nodes.length * 12));
		var dpr = window.devicePixelRatio || 1;
		canvas.width = W * dpr; canvas.height = H * dpr;
		canvas.style.height = H + 'px';
		var ctx = canvas.getContext('2d');
		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, W, H);

		var accent = css.getPropertyValue('--accent').trim();
		var muted = css.getPropertyValue('--muted').trim();
		var text = css.getPropertyValue('--text').trim();
		var border = css.getPropertyValue('--border').trim();
		var cx = W / 2, cy = H / 2;
		var r = Math.min(W, H) / 2 - 34;

		ctx.font = '9px -apple-system, sans-serif';
		nodes.forEach(function(n, i) {
			var a = (Math.PI * 2 * i) / nodes.length - Math.PI / 2;
			n.x = cx + r * Math.cos(a);
			n.y = cy + r * Math.sin(a);
			ctx.strokeStyle = border;
			ctx.lineWidth = 1;
			ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
		});
		nodes.forEach(function(n) {
			ctx.fillStyle = n.type === 'tag' ? '#E985A2' : accent;
			ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI * 2); ctx.fill();
			ctx.fillStyle = muted;
			var label = n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label;
			var tw = ctx.measureText(label).width;
			var lx = n.x < cx - 4 ? n.x - tw - 7 : (n.x > cx + 4 ? n.x + 7 : n.x - tw / 2);
			var ly = n.y < cy ? n.y - 8 : n.y + 14;
			ctx.fillText(label, lx, ly);
		});
		ctx.fillStyle = accent;
		ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
		ctx.fillStyle = text;
		ctx.font = 'bold 10px -apple-system, sans-serif';
		var t = (g.title || '').length > 16 ? g.title.slice(0, 15) + '…' : (g.title || '');
		ctx.fillText(t, cx - ctx.measureText(t).width / 2, cy + 22);
		return true;
	}

	function init() {
		if (buildToc()) {
			var tocBtn = document.getElementById('tocToggle');
			tocBtn.hidden = false;
			wireToggle('toc');
		}
		if (drawGraph()) {
			var gBtn = document.getElementById('graphToggle');
			gBtn.hidden = false;
			wireToggle('graph');
			// redraw with the new palette when the theme flips
			new MutationObserver(drawGraph).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		}
		try {
			if (localStorage.getItem('cmds-panel-toc') === '1' && !document.getElementById('tocToggle').hidden) setPanel('toc', true);
			else if (localStorage.getItem('cmds-panel-graph') === '1' && !document.getElementById('graphToggle').hidden) setPanel('graph', true);
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
