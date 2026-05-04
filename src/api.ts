import { TFile, MarkdownView, Notice } from 'obsidian';
import { CMDSShareSettings, SharedNote, ShareResult, ServerProviderType } from './types';
import { createServerProvider, ServerProvider } from './providers';
import { encryptString, generateShortId, sha1 } from './crypto';
import { generateNoteHtml, generateDefaultCss } from './template';

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
			this.provider = createServerProvider(config, this.settings.uid);
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
		app: { workspace: { getActiveViewOfType: (type: typeof MarkdownView) => MarkdownView | null } }
	): Promise<ShareResult> {
		if (!this.provider) {
			return { success: false, error: 'No server provider configured' };
		}

		try {
			const shortId = generateShortId(8);
			const shouldEncrypt = this.shouldEncrypt(content);
			let finalContent = content;
			let encryptionKey: string | undefined;

			if (shouldEncrypt) {
				const encrypted = await encryptString(JSON.stringify({ content, title }));
				finalContent = JSON.stringify({ ciphertext: encrypted.ciphertext });
				encryptionKey = encrypted.key;
			}

			const extractedContent = await this.extractRenderedContent(app);
			const htmlContent = extractedContent || this.markdownToHtml(content);

			const description = this.extractDescription(content);

			const html = generateNoteHtml({
				title,
				content: shouldEncrypt ? '' : htmlContent,
				cssUrl: await this.uploadCss(),
				noteWidth: this.settings.noteWidth,
				encrypted: shouldEncrypt,
				encryptedData: shouldEncrypt ? finalContent : undefined,
				description: shouldEncrypt ? undefined : description,
			});

			const filename = `${shortId}.html`;
			const result = await this.provider.upload(html, filename, 'text/html');

			if (!result.success) {
				return { success: false, error: result.error };
			}

			let url = result.url || this.provider.getPublicUrl(filename);
			if (shouldEncrypt && encryptionKey) {
				url = `${url}#${encryptionKey}`;
			}

			return {
				success: true,
				url,
				shortId,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async deleteNote(shortId: string): Promise<boolean> {
		if (!this.provider) {
			return false;
		}

		try {
			const result = await this.provider.delete(`${shortId}.html`);
			return result.success;
		} catch {
			return false;
		}
	}

	async uploadAsset(data: ArrayBuffer, filename: string, mimeType: string): Promise<string | null> {
		if (!this.provider) {
			return null;
		}

		try {
			const hash = await sha1(data);
			const ext = filename.split('.').pop() || 'bin';
			const hashedFilename = `assets/${hash}.${ext}`;

			const result = await this.provider.uploadBinary(data, hashedFilename, mimeType);
			return result.success ? result.url || null : null;
		} catch {
			return null;
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
		try {
			const rules: string[] = [];
			Array.from(document.styleSheets).forEach(sheet => {
				try {
					Array.from(sheet.cssRules).forEach(rule => {
						const ruleText = rule.cssText;
						if (!ruleText.includes('@media print')) {
							rules.push(ruleText);
						}
					});
				} catch {
					// Cross-origin stylesheet, skip
				}
			});
			return rules.join('').replace(/\n/g, '');
		} catch {
			return generateDefaultCss();
		}
	}

	private async extractRenderedContent(
		app: { workspace: { getActiveViewOfType: (type: typeof MarkdownView) => MarkdownView | null } }
	): Promise<string | null> {
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

	private shouldEncrypt(content: string): boolean {
		if (this.settings.encryptionMode === 'always') {
			return true;
		}
		if (this.settings.encryptionMode === 'never') {
			return false;
		}

		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (frontmatterMatch) {
			const frontmatter = frontmatterMatch[1];
			if (frontmatter.includes(`${this.settings.encryptedField}: true`)) {
				return true;
			}
			if (frontmatter.includes(`${this.settings.encryptedField}: false`)) {
				return false;
			}
		}

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
