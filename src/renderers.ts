import { App, Component, MarkdownRenderer, Plugin, TFile, parseYaml, stringifyYaml } from 'obsidian';
import * as obsidian from 'obsidian';
import { ShareKind } from './types';

/**
 * Renderers for the non-markdown file types a share can come from:
 * Excalidraw drawings, JSON Canvas boards, and Bases. Each returns a detached
 * element that the share pipeline cleans up, re-hosts assets for, and ships.
 */

export function detectShareKind(file: TFile, app: App): ShareKind | null {
	const ext = file.extension.toLowerCase();
	if (ext === 'canvas') return 'canvas';
	if (ext === 'base') return 'base';
	if (ext === 'excalidraw') return 'excalidraw';
	if (ext !== 'md') return null;
	if (file.name.toLowerCase().endsWith('.excalidraw.md')) return 'excalidraw';
	const fm = app.metadataCache.getFileCache(file)?.frontmatter;
	if (fm && fm['excalidraw-plugin'] != null) return 'excalidraw';
	return 'note';
}

/** File name without type suffixes: "Board.canvas" → "Board", "Sketch.excalidraw.md" → "Sketch". */
export function displayBasename(file: TFile): string {
	return file.basename.replace(/\.excalidraw$/i, '');
}

export const KIND_LABELS: Record<ShareKind, string> = {
	note: 'Note',
	excalidraw: 'Drawing',
	canvas: 'Canvas',
	base: 'Base',
};


// ═══ Excalidraw ═══

interface ExcalidrawAutomateLike {
	getAPI?: () => ExcalidrawAutomateLike;
	reset?: () => void;
	destroy?: () => void;
	createSVG: (templatePath?: string, embedFont?: boolean, exportSettings?: Record<string, unknown>) => Promise<SVGSVGElement>;
}

/**
 * Export a drawing through the Excalidraw plugin's own renderer so fonts,
 * embedded images, and nested drawings match what the user sees.
 */
export async function renderExcalidraw(file: TFile): Promise<HTMLElement> {
	const global = (window as unknown as { ExcalidrawAutomate?: ExcalidrawAutomateLike }).ExcalidrawAutomate;
	if (!global?.createSVG) {
		throw new Error('Sharing drawings needs the Excalidraw plugin enabled');
	}
	// a private instance keeps the shared global EA's state untouched
	const ea = global.getAPI ? global.getAPI() : global;
	try {
		ea.reset?.();
		const svg = await ea.createSVG(file.path, true, { withBackground: true, withTheme: true });
		if (!svg) throw new Error('Excalidraw returned no image');

		// scale down on narrow screens, never up past the drawing's natural size
		const width = parseFloat(svg.getAttribute('width') || '0');
		svg.removeAttribute('width');
		svg.removeAttribute('height');
		svg.setCssStyles({
			maxWidth: width ? `${Math.ceil(width)}px` : '',
			width: '100%', height: 'auto', display: 'block', margin: '0 auto',
		});
		svg.setAttribute('role', 'img');
		svg.setAttribute('aria-label', displayBasename(file));

		const figure = createEl('figure', { cls: 'cmds-excalidraw' });
		figure.appendChild(svg);
		return figure;
	} finally {
		if (ea !== global) ea.destroy?.();
	}
}


// ═══ JSON Canvas ═══

interface CanvasNode {
	id: string;
	type: 'text' | 'file' | 'link' | 'group';
	x: number; y: number; width: number; height: number;
	color?: string;
	text?: string;
	file?: string;
	subpath?: string;
	url?: string;
	label?: string;
}

interface CanvasEdge {
	id: string;
	fromNode: string; toNode: string;
	fromSide?: Side; toSide?: Side;
	fromEnd?: 'none' | 'arrow'; toEnd?: 'none' | 'arrow';
	color?: string;
	label?: string;
}

type Side = 'top' | 'right' | 'bottom' | 'left';
type Point = { x: number; y: number };

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'bmp']);
const CANVAS_PAD = 48;

/** Canvas preset colors "1"–"6" map to CSS vars defined by the share page. */
function canvasColor(color?: string): string | null {
	if (!color) return null;
	if (/^[1-6]$/.test(color)) return `var(--cv-c${color})`;
	if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
	return null;
}

function anchor(n: CanvasNode, side: Side): Point {
	switch (side) {
		case 'top': return { x: n.x + n.width / 2, y: n.y };
		case 'bottom': return { x: n.x + n.width / 2, y: n.y + n.height };
		case 'left': return { x: n.x, y: n.y + n.height / 2 };
		case 'right': return { x: n.x + n.width, y: n.y + n.height / 2 };
	}
}

/** Edges saved without sides attach on the facing sides, like Obsidian does. */
function facingSides(a: CanvasNode, b: CanvasNode): [Side, Side] {
	const dx = (b.x + b.width / 2) - (a.x + a.width / 2);
	const dy = (b.y + b.height / 2) - (a.y + a.height / 2);
	if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? ['right', 'left'] : ['left', 'right'];
	return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}

const NORMALS: Record<Side, Point> = {
	top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

function arrowHead(tip: Point, from: Point, size = 11): string {
	const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
	const spread = Math.PI / 7;
	const p1 = { x: tip.x - size * Math.cos(ang - spread), y: tip.y - size * Math.sin(ang - spread) };
	const p2 = { x: tip.x - size * Math.cos(ang + spread), y: tip.y - size * Math.sin(ang + spread) };
	return `${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
}

export async function renderCanvas(
	app: App,
	file: TFile,
	component: Component
): Promise<{ el: HTMLElement; description: string }> {
	let data: { nodes?: CanvasNode[]; edges?: CanvasEdge[] };
	try {
		data = JSON.parse(await app.vault.read(file) || '{}');
	} catch {
		throw new Error('This canvas file is not valid JSON');
	}
	const nodes = (data.nodes || []).filter(n => Number.isFinite(n.x) && Number.isFinite(n.y));
	const edges = data.edges || [];

	const wrap = createDiv({ cls: 'cmds-canvas' });
	if (nodes.length === 0) {
		wrap.createEl('p', { cls: 'cmds-canvas-empty', text: 'This canvas is empty.' });
		return { el: wrap, description: '' };
	}

	// world bounds — node coordinates are shifted so the world starts at 0,0
	const minX = Math.min(...nodes.map(n => n.x)) - CANVAS_PAD;
	const minY = Math.min(...nodes.map(n => n.y)) - CANVAS_PAD;
	const maxX = Math.max(...nodes.map(n => n.x + n.width)) + CANVAS_PAD;
	const maxY = Math.max(...nodes.map(n => n.y + n.height)) + CANVAS_PAD;
	const W = Math.ceil(maxX - minX);
	const H = Math.ceil(maxY - minY);
	const shift = (n: CanvasNode): CanvasNode => ({ ...n, x: n.x - minX, y: n.y - minY });
	const byId = new Map(nodes.map(n => [n.id, shift(n)]));

	wrap.setAttribute('data-w', String(W));
	wrap.setAttribute('data-h', String(H));
	const world = wrap.createDiv({ cls: 'cmds-canvas-world' });
	world.setCssStyles({ width: `${W}px`, height: `${H}px` });

	const place = (el: HTMLElement, n: CanvasNode) => {
		el.setCssStyles({ left: `${n.x}px`, top: `${n.y}px`, width: `${n.width}px`, height: `${n.height}px` });
		const color = canvasColor(n.color);
		if (color) el.setCssProps({ '--node-color': color });
	};

	// groups paint first (largest underneath), then edges, then content nodes
	const groups = [...byId.values()].filter(n => n.type === 'group')
		.sort((a, b) => b.width * b.height - a.width * a.height);
	for (const g of groups) {
		const el = world.createDiv({ cls: 'cv-group' });
		place(el, g);
		if (g.label) el.createDiv({ cls: 'cv-group-label', text: g.label });
	}

	const svgNS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(svgNS, 'svg');
	svg.setAttribute('class', 'cv-edges');
	svg.setAttribute('width', String(W));
	svg.setAttribute('height', String(H));
	svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
	world.appendChild(svg);
	const labels: { text: string; at: Point; color: string | null }[] = [];

	for (const e of edges) {
		const a = byId.get(e.fromNode);
		const b = byId.get(e.toNode);
		if (!a || !b) continue;
		const [autoFrom, autoTo] = facingSides(a, b);
		const fromSide = e.fromSide || autoFrom;
		const toSide = e.toSide || autoTo;
		const p1 = anchor(a, fromSide);
		const p2 = anchor(b, toSide);
		const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		const k = Math.max(40, Math.min(dist * 0.45, 240));
		const c1 = { x: p1.x + NORMALS[fromSide].x * k, y: p1.y + NORMALS[fromSide].y * k };
		const c2 = { x: p2.x + NORMALS[toSide].x * k, y: p2.y + NORMALS[toSide].y * k };

		const color = canvasColor(e.color);
		const g = document.createElementNS(svgNS, 'g');
		g.setAttribute('class', 'cv-edge');
		if (color) g.setCssProps({ '--edge-color': color });
		const path = document.createElementNS(svgNS, 'path');
		path.setAttribute('d', `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`);
		g.appendChild(path);
		if ((e.toEnd || 'arrow') === 'arrow') {
			const head = document.createElementNS(svgNS, 'polygon');
			head.setAttribute('points', arrowHead(p2, c2));
			g.appendChild(head);
		}
		if (e.fromEnd === 'arrow') {
			const head = document.createElementNS(svgNS, 'polygon');
			head.setAttribute('points', arrowHead(p1, c1));
			g.appendChild(head);
		}
		svg.appendChild(g);

		if (e.label) {
			// cubic bezier midpoint (t = 0.5)
			labels.push({
				text: e.label,
				at: {
					x: 0.125 * p1.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * p2.x,
					y: 0.125 * p1.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * p2.y,
				},
				color,
			});
		}
	}

	let description = '';
	for (const n of byId.values()) {
		if (n.type === 'group') continue;
		const el = world.createDiv({ cls: `cv-node cv-${n.type}` });
		place(el, n);

		if (n.type === 'text') {
			const body = el.createDiv({ cls: 'cv-body markdown-rendered' });
			await MarkdownRenderer.render(app, n.text || '', body, file.path, component);
			if (!description && n.text) description = n.text.replace(/[#*_>`[\]]/g, '').replace(/\s+/g, ' ').trim();
		} else if (n.type === 'link') {
			renderLinkNode(el, n.url || '');
		} else if (n.type === 'file') {
			await renderFileNode(app, el, n, file, component);
		}
	}

	for (const l of labels) {
		const el = world.createDiv({ cls: 'cv-edge-label', text: l.text });
		el.setCssStyles({ left: `${l.at.x}px`, top: `${l.at.y}px` });
		if (l.color) el.setCssProps({ '--edge-color': l.color });
	}

	return { el: wrap, description: description.slice(0, 200) };
}

function renderLinkNode(el: HTMLElement, url: string): void {
	let host = url;
	try { host = new URL(url).host; } catch { /* keep raw */ }
	const a = el.createEl('a', { cls: 'cv-link-card', href: url });
	a.setAttribute('target', '_blank');
	a.setAttribute('rel', 'noopener');
	a.createDiv({ cls: 'cv-link-host', text: host });
	a.createDiv({ cls: 'cv-link-url', text: url });
}

async function renderFileNode(
	app: App,
	el: HTMLElement,
	n: CanvasNode,
	canvasFile: TFile,
	component: Component
): Promise<void> {
	const ref = n.file || '';
	const target = app.vault.getAbstractFileByPath(ref) ?? app.metadataCache.getFirstLinkpathDest(ref, canvasFile.path);
	const name = (ref.split('/').pop() || ref).replace(/\.md$/, '');
	el.createDiv({ cls: 'cv-file-label', text: name + (n.subpath || '') });

	if (!(target instanceof TFile)) {
		el.createDiv({ cls: 'cv-body cv-missing', text: `Missing file: ${ref}` });
		return;
	}
	const ext = target.extension.toLowerCase();
	if (IMAGE_EXTS.has(ext)) {
		el.addClass('cv-image');
		// vault path — the share pipeline re-hosts it like any other embed
		el.createEl('img', { attr: { src: target.path, alt: name } });
		return;
	}
	const kind = detectShareKind(target, app);
	if (kind === 'excalidraw') {
		try {
			el.createDiv({ cls: 'cv-body' }).appendChild(await renderExcalidraw(target));
		} catch {
			el.createDiv({ cls: 'cv-body cv-missing', text: name });
		}
		return;
	}
	if (kind === 'note') {
		const md = (await app.vault.cachedRead(target)).replace(/^---\n[\s\S]*?\n---\n?/, '');
		const body = el.createDiv({ cls: 'cv-body markdown-rendered' });
		await MarkdownRenderer.render(app, md, body, target.path, component);
		return;
	}
	el.createDiv({ cls: 'cv-body cv-missing', text: target.name });
}


// ═══ Bases ═══

/**
 * Bases has no "render to static HTML" API, and its own table view is
 * virtualized (off-screen rows have no cells). Instead we register a tiny
 * view type: the .base file is re-rendered with every view switched to it,
 * so Obsidian's engine evaluates filters/formulas/sort/groups and hands us
 * the finished result set, which we serialize into a plain table.
 */
export const BASE_SNAPSHOT_VIEW = 'cmds-share-snapshot';
const MAX_BASE_ROWS = 2000;

type SnapshotResolver = (el: HTMLElement) => void;
const pendingSnapshots = new Map<string, SnapshotResolver>();

export function registerBaseSnapshotView(plugin: Plugin): void {
	const api = obsidian as unknown as { BasesView?: unknown; RenderContext?: new () => unknown };
	const register = (plugin as unknown as { registerBasesView?: (id: string, reg: unknown) => boolean }).registerBasesView;
	// Bases views arrived in Obsidian 1.10 — older apps simply can't share bases
	if (typeof api.BasesView !== 'function' || typeof register !== 'function') return;

	const Base = api.BasesView as new (controller: unknown) => {
		config: { get(k: string): unknown; getOrder(): string[]; getDisplayName(p: string): string };
		data: {
			data: BaseEntry[];
			groupedData: { key?: BaseValue; entries: BaseEntry[]; hasKey(): boolean }[];
		};
	};

	class ShareSnapshotView extends Base {
		type = BASE_SNAPSHOT_VIEW;
		private hostEl: HTMLElement;

		constructor(controller: unknown, containerEl: HTMLElement) {
			super(controller);
			this.hostEl = containerEl;
		}

		onDataUpdated(): void {
			const token = this.config.get('cmdsShareToken');
			const snapshot = buildBaseSnapshot(
				this.config,
				this.data,
				String(this.config.get('cmdsShareOrigType') || 'table'),
				api.RenderContext ? new api.RenderContext() : {}
			);
			const resolve = typeof token === 'string' ? pendingSnapshots.get(token) : undefined;
			if (resolve) {
				pendingSnapshots.delete(token as string);
				resolve(snapshot);
				return;
			}
			// picked manually from the view menu: show what a share would look like
			this.hostEl.empty();
			this.hostEl.addClass('cmds-share-base-preview');
			this.hostEl.appendChild(snapshot);
		}
	}

	register.call(plugin, BASE_SNAPSHOT_VIEW, {
		name: 'Share snapshot',
		icon: 'share-2',
		factory: (controller: unknown, containerEl: HTMLElement) => new ShareSnapshotView(controller, containerEl),
	});
}

interface BaseValue { toString(): string; renderTo?(el: HTMLElement, ctx: unknown): void }
interface BaseEntry { file: TFile; getValue(prop: string): BaseValue | null }

const WIKILINK_RE = /\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;

function renderValue(cell: HTMLElement, value: BaseValue | null, ctx: unknown): void {
	if (!value) return;
	const text = value.toString();
	if (text === 'null' || text === '') return;
	try {
		if (value.renderTo) value.renderTo(cell, ctx);
		else cell.setText(text);
	} catch {
		cell.setText(text);
	}
	humanizeWikilinks(cell);
}

/**
 * Off-screen, link values render as their raw "[[path|alias]]" source.
 * Show the alias (or the note name) as link-styled text instead — the target
 * note is private, so there is nothing to link to on the web anyway.
 */
function humanizeWikilinks(root: HTMLElement): void {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const targets: Text[] = [];
	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		if (node.textContent?.includes('[[')) targets.push(node);
	}
	for (const node of targets) {
		const text = node.textContent || '';
		const frag = document.createDocumentFragment();
		let last = 0;
		for (const m of text.matchAll(WIKILINK_RE)) {
			const at = m.index ?? 0;
			if (at > last) frag.appendChild(document.createTextNode(text.slice(last, at)));
			const label = (m[2] || (m[1] || '').split('/').pop() || '').trim();
			if (label) frag.appendChild(createSpan({ cls: 'internal-link', text: label }));
			last = at + m[0].length;
		}
		if (last === 0) continue;
		if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
		node.replaceWith(frag);
	}
}

function buildBaseSnapshot(
	config: { getOrder(): string[]; getDisplayName(p: string): string },
	data: { data: BaseEntry[]; groupedData: { key?: BaseValue; entries: BaseEntry[]; hasKey(): boolean }[] },
	origType: string,
	ctx: unknown
): HTMLElement {
	const order = config.getOrder();
	const columns = order.length ? order : ['file.name'];
	const root = createDiv({ cls: 'cmds-base-view' });
	root.createDiv({ cls: 'cmds-base-count', text: `${data.data.length} ${data.data.length === 1 ? 'result' : 'results'}` });

	let budget = MAX_BASE_ROWS;
	for (const group of data.groupedData) {
		if (budget <= 0) break;
		const section = root.createDiv({ cls: 'cmds-base-group' });
		if (group.hasKey()) {
			const head = section.createDiv({ cls: 'cmds-base-group-head' });
			const label = head.createSpan({ cls: 'cmds-base-group-label' });
			renderValue(label, group.key ?? null, ctx);
			if (!label.textContent?.trim()) { label.setText('(empty)'); label.addClass('is-empty'); }
			head.createSpan({ cls: 'cmds-base-group-count', text: String(group.entries.length) });
		}
		const entries = group.entries.slice(0, budget);
		budget -= entries.length;

		if (origType === 'cards') {
			const grid = section.createDiv({ cls: 'cmds-base-cards' });
			for (const entry of entries) {
				const card = grid.createDiv({ cls: 'cmds-base-card' });
				columns.forEach((col, i) => {
					const value = entry.getValue(col);
					if (i === 0) { renderValue(card.createDiv({ cls: 'cmds-base-card-title' }), value, ctx); return; }
					const text = value?.toString();
					if (!text || text === 'null') return;
					const row = card.createDiv({ cls: 'cmds-base-card-prop' });
					row.createSpan({ cls: 'cmds-base-card-key', text: config.getDisplayName(col) });
					renderValue(row.createSpan({ cls: 'cmds-base-card-val' }), value, ctx);
				});
			}
		} else {
			const scroller = section.createDiv({ cls: 'cmds-base-scroll' });
			const table = scroller.createEl('table', { cls: 'cmds-base-table' });
			const hr = table.createTHead().insertRow();
			columns.forEach(col => hr.createEl('th', { text: config.getDisplayName(col) }));
			const tbody = table.createTBody();
			for (const entry of entries) {
				const tr = tbody.insertRow();
				columns.forEach(col => renderValue(tr.insertCell(), entry.getValue(col), ctx));
			}
		}
	}
	if (data.data.length > MAX_BASE_ROWS) {
		root.createDiv({ cls: 'cmds-base-count', text: `Showing the first ${MAX_BASE_ROWS} of ${data.data.length} results.` });
	}
	return root;
}

export async function renderBase(
	app: App,
	file: TFile,
	component: Component
): Promise<{ el: HTMLElement; description: string }> {
	const api = obsidian as unknown as { BasesView?: unknown };
	if (typeof api.BasesView !== 'function') {
		throw new Error('Sharing bases needs Obsidian 1.10 or newer');
	}

	const raw = await app.vault.read(file);
	const config = (parseYaml(raw || '{}') || {}) as Record<string, unknown> & { views?: Record<string, unknown>[] };
	const views = Array.isArray(config.views) && config.views.length
		? config.views
		: [{ type: 'table', name: 'Table' }];

	const out = createDiv({ cls: 'cmds-base' });
	// Bases lays views out only when attached — render off-screen, then detach
	const stage = document.body.createDiv();
	stage.setCssStyles({ position: 'fixed', left: '-100000px', top: '0', width: '1200px', height: '800px', overflow: 'hidden' });

	let total = 0;
	try {
		for (const view of views) {
			const token = `s${Math.random().toString(36).slice(2)}`;
			const single = {
				...config,
				views: [{ ...view, type: BASE_SNAPSHOT_VIEW, cmdsShareToken: token, cmdsShareOrigType: view.type }],
			};
			const snapshot = new Promise<HTMLElement>((resolve, reject) => {
				pendingSnapshots.set(token, resolve);
				window.setTimeout(() => {
					if (pendingSnapshots.delete(token)) reject(new Error('Timed out evaluating the base'));
				}, 10000);
			});
			const holder = stage.createDiv();
			await MarkdownRenderer.render(app, '```base\n' + stringifyYaml(single) + '\n```', holder, file.path, component);
			const el = await snapshot;

			const section = out.createEl('section', { cls: 'cmds-base-section' });
			if (views.length > 1) section.createEl('h2', { cls: 'cmds-base-view-name', text: String(view.name || view.type || 'View') });
			section.appendChild(el);
			total += parseInt(el.querySelector('.cmds-base-count')?.textContent || '0', 10) || 0;
		}
	} finally {
		stage.remove();
	}
	return { el: out, description: `${total} ${total === 1 ? 'entry' : 'entries'} from ${displayBasename(file)}` };
}
