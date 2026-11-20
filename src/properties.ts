import { PropertiesView } from './types';
import { escapeAttr, escapeHtml } from './template';

/**
 * The note's properties (YAML frontmatter) as a foldable block at the top of
 * the share page. It is a plain <details>, so folding works without scripts,
 * and it travels inside the note HTML — on encrypted shares it is encrypted
 * with the body.
 */
export interface PropertiesOptions {
	view: PropertiesView;
	/** Property names left out (case-insensitive): CMDS Share's own fields + the user's list. */
	hiddenKeys: string[];
	lang: 'ko' | 'en';
}

const CHEVRON = '<svg class="cmds-props-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

/**
 * Values that only mean something on the author's computer: app deep links
 * (obsidian://, file://, any non-web scheme) and absolute local paths. They
 * are useless to readers and can reveal folder names or session ids.
 */
const LOCAL_ONLY = /^(?:(?!https?:)[a-z][a-z0-9+.-]*:\/\/|file:|~[/\\]|\/(?:Users|home|Volumes|private|var|tmp)\/|[a-z]:[/\\])/i;

export function renderPropertiesBlock(frontmatter: unknown, opts: PropertiesOptions): string {
	if (opts.view === 'hidden' || !isPlainObject(frontmatter)) return '';
	const hidden = new Set(opts.hiddenKeys.map(k => k.trim().toLowerCase()).filter(Boolean));

	const rows: string[] = [];
	for (const key of Object.keys(frontmatter)) {
		if (hidden.has(key.toLowerCase())) continue;
		const value = publicValue(frontmatter[key]);
		if (value === undefined) continue;
		const isTags = /^tags?$/i.test(key);
		rows.push(
			`<div class="cmds-prop"><div class="cmds-prop-key">${escapeHtml(key)}</div>`
			+ `<div class="cmds-prop-value">${renderValue(value, isTags)}</div></div>`
		);
	}
	if (rows.length === 0) return '';

	const label = opts.lang === 'ko' ? '속성' : 'Properties';
	return `<details class="cmds-props"${opts.view === 'expanded' ? ' open' : ''}>`
		+ `<summary>${CHEVRON}<span class="cmds-props-label">${label}</span><span class="cmds-props-count">${rows.length}</span></summary>`
		+ `<div class="cmds-props-list">${rows.join('')}</div></details>`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

/** The value with empty and local-only parts dropped; undefined when nothing is left to show. */
function publicValue(v: unknown): unknown {
	if (v == null) return undefined;
	if (typeof v === 'string') {
		const s = v.trim();
		return s && !LOCAL_ONLY.test(s) ? s : undefined;
	}
	if (Array.isArray(v)) {
		const items = v.map(publicValue).filter(item => item !== undefined);
		return items.length ? items : undefined;
	}
	if (isPlainObject(v)) {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(v)) {
			const item = publicValue(v[key]);
			if (item !== undefined) out[key] = item;
		}
		return Object.keys(out).length ? out : undefined;
	}
	return v;
}

function renderValue(v: unknown, isTags: boolean): string {
	if (isTags) {
		const tags = Array.isArray(v) ? v.map(String) : String(v).split(/[,\s]+/);
		return tags.filter(Boolean).map(tag =>
			`<span class="cmds-prop-pill is-tag">#${escapeHtml(tag.replace(/^#/, ''))}</span>`
		).join('');
	}
	if (Array.isArray(v)) {
		return v.map(item => `<span class="cmds-prop-pill">${renderScalar(item)}</span>`).join('');
	}
	return renderScalar(v);
}

function renderScalar(v: unknown): string {
	// drawn, not <input>: native checkboxes follow the OS color scheme, not the page's
	if (typeof v === 'boolean') return `<span class="cmds-prop-check${v ? ' is-on' : ''}" role="img" aria-label="${v}">${v ? CHECK : ''}</span>`;
	if (v instanceof Date) return escapeHtml(formatDate(v));
	if (v !== null && typeof v === 'object') return `<code>${escapeHtml(JSON.stringify(v))}</code>`;
	return renderText(String(v));
}

function formatDate(d: Date): string {
	const iso = d.toISOString();
	return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso.slice(0, 16).replace('T', ' ');
}

/** [[wikilinks]] read as their link text; markdown and bare web links become real links. */
const INLINE_LINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"']+)/g;

function renderText(s: string): string {
	let out = '';
	let last = 0;
	INLINE_LINK_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = INLINE_LINK_RE.exec(s)) !== null) {
		out += escapeHtml(s.slice(last, m.index));
		if (m[1] !== undefined) {
			out += `<span class="internal-link">${escapeHtml(m[2] ?? wikilinkText(m[1]))}</span>`;
		} else {
			const href = m[4] ?? m[5];
			const text = m[3] ?? m[5];
			out += `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
		}
		last = m.index + m[0].length;
	}
	return out + escapeHtml(s.slice(last));
}

/** "folder/Note#Heading" → "Note > Heading" (what Obsidian shows for an unaliased link). */
function wikilinkText(target: string): string {
	const hash = target.indexOf('#');
	const path = hash >= 0 ? target.slice(0, hash) : target;
	const sub = hash >= 0 ? target.slice(hash + 1) : '';
	const name = (path.split('/').pop() || '').replace(/\.md$/i, '');
	if (!sub) return name;
	return name ? `${name} > ${sub}` : sub;
}
