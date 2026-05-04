import { NoteTemplateData } from './types';

export function generateNoteHtml(data: NoteTemplateData): string {
	const {
		title,
		content,
		cssUrl,
		noteWidth,
		encrypted,
		encryptedData,
		description,
		theme = 'auto',
	} = data;

	const metaDescription = description 
		? `<meta name="description" content="${escapeHtml(description.slice(0, 200))}">`
		: '';

	const themeClass = theme === 'auto' 
		? 'theme-auto' 
		: theme === 'dark' ? 'theme-dark' : 'theme-light';

	const cssLink = cssUrl 
		? `<link rel="stylesheet" href="${cssUrl}">`
		: '';

	const encryptedDataDiv = encrypted && encryptedData
		? `<div id="encrypted-data" style="display:none">${encryptedData}</div>`
		: '';

	const decryptionScript = encrypted ? DECRYPTION_SCRIPT : '';

	const bodyContent = encrypted 
		? '<div id="note-content" class="markdown-preview-view"><p>Loading encrypted content...</p></div>'
		: `<div id="note-content" class="markdown-preview-view">${content}</div>`;

	return `<!DOCTYPE html>
<html lang="en" class="${themeClass}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(title)}</title>
	${metaDescription}
	<meta property="og:title" content="${escapeHtml(title)}">
	<meta property="og:type" content="article">
	${cssLink}
	<style>
		:root {
			--note-width: ${noteWidth};
		}
		
		html, body {
			margin: 0;
			padding: 0;
			min-height: 100vh;
		}
		
		body {
			display: flex;
			justify-content: center;
			padding: 40px 20px;
			box-sizing: border-box;
		}
		
		#note-content {
			max-width: var(--note-width);
			width: 100%;
		}
		
		.theme-auto {
			color-scheme: light dark;
		}
		
		@media (prefers-color-scheme: dark) {
			.theme-auto {
				--background-primary: #1e1e1e;
				--text-normal: #dcddde;
			}
		}
		
		#note-content.loading {
			opacity: 0.5;
		}
		
		.decrypt-error {
			color: #e74c3c;
			padding: 20px;
			text-align: center;
			border: 1px solid #e74c3c;
			border-radius: 8px;
			margin: 20px 0;
		}
	</style>
</head>
<body>
	${encryptedDataDiv}
	${bodyContent}
	${decryptionScript}
</body>
</html>`;
}

const DECRYPTION_SCRIPT = `
<script>
(async function() {
	const CHUNK_SIZE = 2000;
	
	function base64ToArrayBuffer(base64) {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	}
	
	function indexToIv(index) {
		const iv = new Uint8Array(12);
		const view = new DataView(iv.buffer);
		view.setUint32(0, index, true);
		return iv;
	}
	
	async function getAesKey(masterKey) {
		return await crypto.subtle.importKey(
			'raw',
			masterKey,
			{ name: 'AES-GCM' },
			false,
			['decrypt']
		);
	}
	
	async function decrypt(ciphertext, key) {
		const masterKey = base64ToArrayBuffer(key);
		const aesKey = await getAesKey(masterKey);
		const chunks = [];
		
		for (let i = 0; i < ciphertext.length; i++) {
			const chunk = base64ToArrayBuffer(ciphertext[i]);
			const decrypted = await crypto.subtle.decrypt(
				{ name: 'AES-GCM', iv: indexToIv(i) },
				aesKey,
				chunk
			);
			chunks.push(new TextDecoder().decode(decrypted));
		}
		
		return chunks.join('');
	}
	
	try {
		const key = window.location.hash.slice(1);
		if (!key) {
			throw new Error('No decryption key found in URL');
		}
		
		const dataEl = document.getElementById('encrypted-data');
		if (!dataEl) {
			throw new Error('No encrypted data found');
		}
		
		const encryptedData = JSON.parse(dataEl.textContent);
		const decrypted = await decrypt(encryptedData.ciphertext, key);
		const data = JSON.parse(decrypted);
		
		const contentEl = document.getElementById('note-content');
		contentEl.innerHTML = data.content;
		
		if (data.title) {
			document.title = data.title;
		}
	} catch (error) {
		console.error('Decryption failed:', error);
		const contentEl = document.getElementById('note-content');
		contentEl.innerHTML = '<div class="decrypt-error">Failed to decrypt note. Please check the URL.</div>';
	}
})();
</script>
`;

export function generateDefaultCss(): string {
	return `
:root {
	--background-primary: #ffffff;
	--background-secondary: #f5f6f8;
	--text-normal: #2e3338;
	--text-muted: #888888;
	--text-accent: #705dcf;
	--interactive-accent: #705dcf;
	--link-color: #705dcf;
	--code-background: #f5f6f8;
	--blockquote-border: #705dcf;
}

@media (prefers-color-scheme: dark) {
	:root {
		--background-primary: #1e1e1e;
		--background-secondary: #262626;
		--text-normal: #dcddde;
		--text-muted: #999999;
		--text-accent: #7f6df2;
		--interactive-accent: #7f6df2;
		--link-color: #7f6df2;
		--code-background: #2d2d2d;
		--blockquote-border: #7f6df2;
	}
}

body {
	background: var(--background-primary);
	color: var(--text-normal);
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
	font-size: 16px;
	line-height: 1.6;
}

a {
	color: var(--link-color);
	text-decoration: none;
}

a:hover {
	text-decoration: underline;
}

h1, h2, h3, h4, h5, h6 {
	margin-top: 1.5em;
	margin-bottom: 0.5em;
	font-weight: 600;
}

h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }

code {
	background: var(--code-background);
	padding: 2px 6px;
	border-radius: 4px;
	font-family: "SF Mono", Monaco, monospace;
	font-size: 0.9em;
}

pre {
	background: var(--code-background);
	padding: 16px;
	border-radius: 8px;
	overflow-x: auto;
}

pre code {
	background: none;
	padding: 0;
}

blockquote {
	border-left: 3px solid var(--blockquote-border);
	margin: 1em 0;
	padding-left: 1em;
	color: var(--text-muted);
}

img {
	max-width: 100%;
	height: auto;
}

table {
	border-collapse: collapse;
	width: 100%;
	margin: 1em 0;
}

th, td {
	border: 1px solid var(--background-secondary);
	padding: 8px 12px;
	text-align: left;
}

th {
	background: var(--background-secondary);
}

.callout {
	background: var(--background-secondary);
	border-radius: 8px;
	padding: 16px;
	margin: 1em 0;
}

.callout-title {
	font-weight: 600;
	margin-bottom: 8px;
}
`;
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}
