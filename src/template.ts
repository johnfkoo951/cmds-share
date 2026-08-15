import { NoteTemplateData } from './types';

const FAVICON_URL = 'https://cmdspace.work/assets/logos/cmds-logo-round.png';

export function generateNoteHtml(data: NoteTemplateData): string {
	const {
		title,
		content,
		cssUrl,
		noteWidth,
		encrypted,
		encryptedData,
		description,
	} = data;

	const safeTitle = escapeHtml(title);
	const safeDesc = escapeHtml((description || title).slice(0, 200));

	const cssLink = cssUrl
		? `<link rel="stylesheet" href="${escapeAttr(cssUrl)}">`
		: '';

	const encryptedDataDiv = encrypted && encryptedData
		? `<script type="application/json" id="encrypted-data">${escapeJson(encryptedData)}</script>`
		: '';

	const decryptionScript = encrypted ? DECRYPTION_SCRIPT : '';

	const bodyContent = encrypted
		? '<article id="note-content" class="markdown-rendered"><p class="cmds-loading">Decrypting…</p></article>'
		: `<article id="note-content" class="markdown-rendered">${content}</article>`;

	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}">

<link rel="icon" type="image/png" href="${FAVICON_URL}">
<link rel="apple-touch-icon" href="${FAVICON_URL}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="CMDSPACE">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:image" content="${FAVICON_URL}">
<meta property="og:locale" content="ko_KR">

<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
<meta name="twitter:image" content="${FAVICON_URL}">

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
}
[data-theme="dark"] {
	--text: #f2f4f3;
	--muted: #9aa39d;
	--bg: #06080a;
	--accent: #E985A2;
	--accent-light: #F4A4B8;
	--accent-on: #0b0f0d;
	--border: #1a231f;
	--code-bg: #161c19;
	--card-bg: #0d1411;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { color-scheme: light dark; transition: background-color .2s; }
body {
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Pretendard', 'Segoe UI', system-ui, sans-serif;
	color: var(--text); background: var(--bg); line-height: 1.7;
	font-size: 16px; -webkit-font-smoothing: antialiased;
	transition: background-color .2s, color .2s;
}
.theme-toggle {
	position: fixed; top: 1rem; right: 1rem; z-index: 100;
	width: 36px; height: 36px;
	background: var(--card-bg);
	border: 1px solid var(--border);
	border-radius: 50%;
	cursor: pointer;
	display: grid; place-items: center;
	color: var(--text);
	transition: border-color .15s, background .15s;
}
.theme-toggle:hover { border-color: var(--accent); }
.theme-toggle svg { width: 16px; height: 16px; }

main {
	max-width: var(--max); margin: 0 auto; padding: 4rem 1.5rem 3rem;
}

#note-content { font-size: 1rem; }
#note-content h1, #note-content h2, #note-content h3,
#note-content h4, #note-content h5, #note-content h6 {
	font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;
	margin: 2rem 0 0.75rem;
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
	background: #1a1a1a; color: #e0e0e0; padding: 1rem; border-radius: 8px;
	overflow-x: auto; font-size: 0.85rem; line-height: 1.6;
	font-family: 'SF Mono', 'Menlo', monospace; margin: 1rem 0;
}
[data-theme="dark"] #note-content pre { background: #0a0d0b; border: 1px solid var(--border); }
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
	padding: 2rem 1.5rem 1rem; border-top: 1px solid var(--border);
	font-size: 0.75rem; color: var(--muted); text-align: center;
}
.cmds-meta a { color: var(--accent); text-decoration: none; font-weight: 600; }
.cmds-loading { color: var(--muted); font-style: italic; }
.decrypt-error {
	color: #c62828; background: #fce4ec; padding: 1rem; border-radius: 8px;
	border: 1px solid #c62828; margin: 2rem 0; text-align: center;
}
[data-theme="dark"] .decrypt-error { background: #4a1a24; color: #ff8899; border-color: #ff8899; }
</style>
${cssLink}
</head>
<body>

<button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
	<svg id="themeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg>
</button>

<main>
	${bodyContent}
</main>

<footer class="cmds-meta">
	Shared via <a href="https://cmdspace.work" target="_blank" rel="noopener">CMDS Share</a>
</footer>

${encryptedDataDiv}
${decryptionScript}

<script>
(function() {
	var icon = document.getElementById('themeIcon');
	var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
	var MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
	function apply(theme) {
		document.documentElement.dataset.theme = theme;
		try { localStorage.setItem('cmds-theme', theme); } catch(e) {}
		if (icon) icon.innerHTML = theme === 'dark' ? MOON : SUN;
	}
	var btn = document.getElementById('themeToggle');
	if (btn) btn.addEventListener('click', function() {
		apply(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
	});
	var saved = null;
	try { saved = localStorage.getItem('cmds-theme'); } catch(e) {}
	var initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
	apply(initial);
})();
</script>
</body>
</html>`;
}

const DECRYPTION_SCRIPT = `
<script>
(async function() {
	function base64ToArrayBuffer(b64) {
		const bin = atob(b64); const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return bytes.buffer;
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
		const masterKey = base64ToArrayBuffer(key);
		const aesKey = await crypto.subtle.importKey('raw', masterKey, { name: 'AES-GCM' }, false, ['decrypt']);

		const chunks = [];
		for (let i = 0; i < payload.ciphertext.length; i++) {
			const chunk = base64ToArrayBuffer(payload.ciphertext[i]);
			const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: indexToIv(i) }, aesKey, chunk);
			chunks.push(new TextDecoder().decode(decrypted));
		}

		const data = JSON.parse(chunks.join(''));
		const target = document.getElementById('note-content');
		target.innerHTML = data.content;
		if (data.title) document.title = data.title;
	} catch (err) {
		console.error('Decryption failed:', err);
		const target = document.getElementById('note-content');
		if (target) target.innerHTML = '<div class="decrypt-error">Failed to decrypt note. Check the URL fragment.</div>';
	}
})();
</script>
`;

export function generateDefaultCss(): string {
	return '';
}

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
