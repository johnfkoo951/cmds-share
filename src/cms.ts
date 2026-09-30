import {
	ItemView,
	WorkspaceLeaf,
	Notice,
	Menu,
	TFile,
	setIcon,
} from 'obsidian';
import type CMDSSharePlugin from './main';
import {
	CMS_VIEW_TYPE,
	SharedNote,
	CMSStats,
	PROVIDER_DISPLAY_NAMES,
	SUPPORTED_PROVIDERS,
	ServerProviderType,
	ShareKind,
} from './types';
import { RemoteNoteMeta } from './providers';
import { ConfirmDeleteModal } from './modals';

type Filter = 'all' | 'live' | 'encrypted' | 'expiring' | 'inactive';
type Sort = 'recent' | 'views' | 'title';

const KIND_ICONS: Record<ShareKind, string> = {
	note: 'file-text',
	excalidraw: 'pencil-ruler',
	canvas: 'layout-dashboard',
	base: 'database',
};

const PROVIDER_ICONS: Record<ServerProviderType, string> = {
	cloud: 'cloud',
	github: 'github',
	synology: 'hard-drive',
	supabase: 'database-zap',
	convex: 'server',
};

const DAY = 24 * 60 * 60 * 1000;

export class CMSView extends ItemView {
	plugin: CMDSSharePlugin;
	private refreshInterval: number | null = null;
	private query = '';
	private filter: Filter = 'all';
	private sort: Sort = 'recent';
	private listEl: HTMLElement | null = null;
	private chipsEl: HTMLElement | null = null;
	private remote: RemoteNoteMeta[] | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CMDSSharePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return CMS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'CMDS Share';
	}

	getIcon(): string {
		return 'share-2';
	}

	async onOpen(): Promise<void> {
		await this.render();
		if (this.plugin.settings.cmsAutoRefresh) {
			this.startAutoRefresh();
		}
	}

	async onClose(): Promise<void> {
		this.stopAutoRefresh();
	}

	private startAutoRefresh(): void {
		this.stopAutoRefresh();
		this.refreshInterval = window.setInterval(() => {
			void this.render();
		}, 60000);
	}

	private stopAutoRefresh(): void {
		if (this.refreshInterval) {
			window.clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}
	}

	/** Full refresh: reconcile with the server, then redraw everything. */
	async render(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.addClass('cmds-share-cms');

		const spinner = container.querySelector('.cmds-cms-refresh');
		spinner?.addClass('is-spinning');

		// pull server registry first so view counts / revocation are current
		this.remote = await this.plugin.reconcileSharedNotes();

		container.empty();
		const notes = this.plugin.getSharedNotes();

		this.renderHeader(container);
		this.renderStats(container, this.calculateStats(notes));
		this.renderToolbar(container);
		this.listEl = container.createDiv({ cls: 'cmds-cms-list' });
		this.renderList();

		if (this.remote) {
			const localIds = new Set(notes.map(n => n.shortId));
			const orphans = this.remote.filter(r => !localIds.has(r.shortId));
			if (orphans.length > 0) this.renderOrphans(container, orphans);
		}
	}

	// ── header ──────────────────────────────────────────────

	private renderHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: 'cmds-cms-header' });

		const brand = header.createDiv({ cls: 'cmds-cms-brand' });
		setIcon(brand.createDiv({ cls: 'cmds-cms-logo' }), 'share-2');
		const text = brand.createDiv({ cls: 'cmds-cms-brand-text' });
		text.createDiv({ cls: 'cmds-cms-title', text: 'CMDS Share' });

		const provider = this.plugin.settings.activeProvider;
		const configured = !!this.plugin.api.getActiveProvider();
		const pill = text.createDiv({ cls: `cmds-cms-provider ${configured ? 'is-ready' : 'is-off'}` });
		pill.createSpan({ cls: 'cmds-cms-dot' });
		setIcon(pill.createSpan({ cls: 'cmds-cms-provider-icon' }), PROVIDER_ICONS[provider]);
		pill.createSpan({ text: PROVIDER_DISPLAY_NAMES[provider] });
		pill.setAttr('aria-label', configured ? 'Provider configured' : 'Provider not configured — open settings');

		const actions = header.createDiv({ cls: 'cmds-cms-header-actions' });
		this.iconButton(actions, 'share', 'Share the active file', () => {
			const file = this.app.workspace.getActiveFile();
			if (file) void this.plugin.shareNote(file).then(() => this.render());
			else new Notice('Open a note, canvas, drawing, or base first');
		}, 'mod-cta');
		this.iconButton(actions, 'refresh-cw', 'Refresh', () => { void this.render(); }, 'cmds-cms-refresh');
		this.iconButton(actions, 'settings', 'Settings', () => this.openSettings());
	}

	// ── stats ───────────────────────────────────────────────

	private calculateStats(notes: SharedNote[]): CMSStats {
		const byProvider = {} as Record<ServerProviderType, number>;
		SUPPORTED_PROVIDERS.forEach(p => { byProvider[p] = 0; });
		notes.forEach(note => { byProvider[note.provider] = (byProvider[note.provider] || 0) + 1; });

		return {
			totalNotes: notes.length,
			publishedNotes: notes.filter(n => this.isLive(n)).length,
			encryptedNotes: notes.filter(n => n.encrypted).length,
			totalViews: notes.reduce((sum, n) => sum + (n.viewCount || 0), 0),
			byProvider,
		};
	}

	private renderStats(container: HTMLElement, stats: CMSStats): void {
		const grid = container.createDiv({ cls: 'cmds-cms-stats' });
		const hasViews = this.plugin.getSharedNotes().some(n => n.viewCount !== undefined);
		const items: { icon: string; value: string; label: string; cls?: string }[] = [
			{ icon: 'layers', value: String(stats.totalNotes), label: 'Shared' },
			{ icon: 'radio', value: String(stats.publishedNotes), label: 'Live', cls: 'is-live' },
			{ icon: 'lock', value: String(stats.encryptedNotes), label: 'Encrypted' },
			{ icon: 'eye', value: hasViews ? compactNumber(stats.totalViews) : '—', label: 'Views' },
		];
		for (const item of items) {
			const card = grid.createDiv({ cls: `cmds-cms-stat ${item.cls || ''}` });
			setIcon(card.createDiv({ cls: 'cmds-cms-stat-icon' }), item.icon);
			card.createDiv({ cls: 'cmds-cms-stat-value', text: item.value });
			card.createDiv({ cls: 'cmds-cms-stat-label', text: item.label });
		}
	}

	// ── toolbar: search, filter chips, sort ─────────────────

	private renderToolbar(container: HTMLElement): void {
		const bar = container.createDiv({ cls: 'cmds-cms-toolbar' });

		const search = bar.createDiv({ cls: 'cmds-cms-search' });
		setIcon(search.createSpan({ cls: 'cmds-cms-search-icon' }), 'search');
		const input = search.createEl('input', {
			type: 'search',
			placeholder: 'Search title or path…',
			value: this.query,
		});
		input.addEventListener('input', () => {
			this.query = input.value;
			this.renderList();
		});

		const sort = bar.createEl('select', { cls: 'dropdown cmds-cms-sort' });
		([['recent', 'Recently updated'], ['views', 'Most viewed'], ['title', 'Title A–Z']] as [Sort, string][])
			.forEach(([value, label]) => sort.createEl('option', { value, text: label }));
		sort.value = this.sort;
		sort.addEventListener('change', () => {
			this.sort = sort.value as Sort;
			this.renderList();
		});

		this.chipsEl = container.createDiv({ cls: 'cmds-cms-chips' });
		this.renderChips();
	}

	private renderChips(): void {
		if (!this.chipsEl) return;
		this.chipsEl.empty();
		const notes = this.plugin.getSharedNotes();
		const chips: [Filter, string][] = [
			['all', 'All'], ['live', 'Live'], ['encrypted', 'Encrypted'], ['expiring', 'Expiring'], ['inactive', 'Inactive'],
		];
		for (const [value, label] of chips) {
			const count = notes.filter(n => this.matchesFilter(n, value)).length;
			if (value !== 'all' && value !== this.filter && count === 0) continue;
			const chip = this.chipsEl.createEl('button', { cls: `cmds-cms-chip ${this.filter === value ? 'is-active' : ''}` });
			chip.createSpan({ text: label });
			chip.createSpan({ cls: 'cmds-cms-chip-count', text: String(count) });
			chip.addEventListener('click', () => {
				this.filter = value;
				this.renderChips();
				this.renderList();
			});
		}
	}

	private isLive(n: SharedNote): boolean {
		return !n.revoked && n.status === 'published' && !(n.expiresAt && n.expiresAt < Date.now());
	}

	private matchesFilter(n: SharedNote, filter: Filter): boolean {
		switch (filter) {
			case 'all': return true;
			case 'live': return this.isLive(n);
			case 'encrypted': return n.encrypted;
			case 'expiring': return !!n.expiresAt && n.expiresAt > Date.now() && n.expiresAt - Date.now() < 7 * DAY;
			case 'inactive': return !this.isLive(n);
		}
	}

	// ── list ────────────────────────────────────────────────

	private renderList(): void {
		const list = this.listEl;
		if (!list) return;
		list.empty();

		const all = this.plugin.getSharedNotes();
		if (all.length === 0) {
			this.renderEmpty(list);
			return;
		}

		const q = this.query.trim().toLowerCase();
		const notes = all
			.filter(n => this.matchesFilter(n, this.filter))
			.filter(n => !q || n.title.toLowerCase().includes(q) || n.filePath.toLowerCase().includes(q))
			.sort((a, b) => {
				if (this.sort === 'views') return (b.viewCount || 0) - (a.viewCount || 0) || b.updatedAt - a.updatedAt;
				if (this.sort === 'title') return a.title.localeCompare(b.title);
				return b.updatedAt - a.updatedAt;
			});

		if (notes.length === 0) {
			const none = list.createDiv({ cls: 'cmds-cms-none' });
			setIcon(none.createDiv({ cls: 'cmds-cms-none-icon' }), 'search-x');
			none.createDiv({ text: 'Nothing matches this view.' });
			return;
		}

		notes.forEach(note => this.renderCard(list, note));
	}

	private renderEmpty(list: HTMLElement): void {
		const empty = list.createDiv({ cls: 'cmds-cms-empty' });
		setIcon(empty.createDiv({ cls: 'cmds-cms-empty-art' }), 'send');
		empty.createDiv({ cls: 'cmds-cms-empty-title', text: 'Nothing shared yet' });
		empty.createDiv({
			cls: 'cmds-cms-empty-text',
			text: 'Share a note, canvas, Excalidraw drawing, or base — it will show up here with its link, views, and expiry.',
		});
		const btn = empty.createEl('button', { cls: 'mod-cta', text: 'Share the active file' });
		btn.addEventListener('click', () => {
			const file = this.app.workspace.getActiveFile();
			if (file) void this.plugin.shareNote(file).then(() => this.render());
			else new Notice('Open a note first');
		});
	}

	private renderCard(list: HTMLElement, note: SharedNote): void {
		const kind = note.kind || 'note';
		const state = this.stateOf(note);
		const card = list.createDiv({ cls: `cmds-cms-card is-${state.key}` });

		const icon = card.createDiv({ cls: `cmds-cms-kind kind-${kind}` });
		setIcon(icon, KIND_ICONS[kind]);
		if (note.encrypted) {
			const lock = icon.createDiv({ cls: 'cmds-cms-kind-lock' });
			setIcon(lock, 'lock');
		}

		const body = card.createDiv({ cls: 'cmds-cms-card-body' });

		const top = body.createDiv({ cls: 'cmds-cms-card-top' });
		const title = top.createEl('a', { cls: 'cmds-cms-card-title', text: note.title, href: '#' });
		title.setAttr('aria-label', note.filePath);
		title.addEventListener('click', (e) => {
			e.preventDefault();
			void this.openNote(note);
		});
		const status = top.createSpan({ cls: `cmds-cms-status is-${state.key}` });
		status.createSpan({ cls: 'cmds-cms-dot' });
		status.createSpan({ text: state.label });

		const path = note.filePath.split('/').slice(0, -1).join(' / ');
		if (path) body.createDiv({ cls: 'cmds-cms-card-path', text: path });

		const meta = body.createDiv({ cls: 'cmds-cms-card-meta' });
		this.metaItem(meta, PROVIDER_ICONS[note.provider], PROVIDER_DISPLAY_NAMES[note.provider].replace(/\s*\(.*\)$/, ''));
		this.metaItem(meta, 'clock', relativeTime(note.updatedAt), new Date(note.updatedAt).toLocaleString());
		if (note.viewCount !== undefined) this.metaItem(meta, 'eye', `${compactNumber(note.viewCount)} views`);
		if (note.expiresAt) {
			const expiry = this.metaItem(meta, 'hourglass', expiresLabel(note.expiresAt), new Date(note.expiresAt).toLocaleString());
			if (note.expiresAt > Date.now() && note.expiresAt - Date.now() < 7 * DAY) expiry.addClass('is-warn');
		}

		const url = body.createDiv({ cls: 'cmds-cms-card-url' });
		const link = url.createEl('a', { text: displayUrl(note.url), href: note.url });
		link.setAttr('target', '_blank');

		const actions = card.createDiv({ cls: 'cmds-cms-card-actions' });
		this.iconButton(actions, 'copy', 'Copy link', () => {
			void navigator.clipboard.writeText(note.url).then(() => new Notice('Link copied'));
		});
		this.iconButton(actions, 'external-link', 'Open in browser', () => window.open(note.url, '_blank'));
		this.iconButton(actions, 'more-horizontal', 'More', (e) => this.showContextMenu(e, note));

		card.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showContextMenu(e, note);
		});
	}

	private stateOf(note: SharedNote): { key: string; label: string } {
		if (note.revoked) return { key: 'revoked', label: 'Revoked' };
		if (note.status === 'expired' || (note.expiresAt && note.expiresAt < Date.now())) return { key: 'expired', label: 'Expired' };
		if (note.status === 'archived') return { key: 'archived', label: 'Archived' };
		if (note.status === 'draft') return { key: 'draft', label: 'Draft' };
		return { key: 'live', label: 'Live' };
	}

	private metaItem(parent: HTMLElement, icon: string, text: string, tooltip?: string): HTMLElement {
		const item = parent.createSpan({ cls: 'cmds-cms-meta-item' });
		setIcon(item.createSpan({ cls: 'cmds-cms-meta-icon' }), icon);
		item.createSpan({ text });
		if (tooltip) item.setAttr('aria-label', tooltip);
		return item;
	}

	private iconButton(parent: HTMLElement, icon: string, label: string, onClick: (e: MouseEvent) => void, cls = ''): HTMLElement {
		const btn = parent.createEl('button', { cls: `cmds-cms-icon-btn clickable-icon ${cls}` });
		setIcon(btn, icon);
		btn.setAttr('aria-label', label);
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			onClick(e);
		});
		return btn;
	}

	// ── orphans ─────────────────────────────────────────────

	/** Shares that exist on the server but have no local record (e.g. lost data.json). */
	private renderOrphans(container: HTMLElement, orphans: RemoteNoteMeta[]): void {
		const section = container.createEl('details', { cls: 'cmds-cms-orphans' });
		const summary = section.createEl('summary');
		setIcon(summary.createSpan({ cls: 'cmds-cms-orphans-icon' }), 'cloud-off');
		summary.createSpan({ text: `On server only · ${orphans.length}` });
		section.createDiv({
			cls: 'cmds-cms-orphans-hint',
			text: 'These shares exist on the server without a local record (for example after reinstalling the plugin).',
		});

		orphans.forEach(orphan => {
			const row = section.createDiv({ cls: 'cmds-cms-orphan' });
			const info = row.createDiv({ cls: 'cmds-cms-orphan-info' });
			info.createDiv({ cls: 'cmds-cms-orphan-title', text: (orphan.encrypted ? '🔒 ' : '') + (orphan.title || orphan.shortId) });
			info.createDiv({
				cls: 'cmds-cms-orphan-meta',
				text: `${orphan.shortId} · ${compactNumber(orphan.viewCount)} views${orphan.revoked ? ' · revoked' : ''}`,
			});
			this.iconButton(row, 'trash-2', 'Delete from server', () => {
				void (async () => {
					const provider = this.plugin.api.getActiveProvider();
					if (!provider) return;
					const result = await provider.delete(`${orphan.shortId}.html`);
					new Notice(result.success ? 'Deleted from server' : 'Delete failed');
					await this.render();
				})();
			}, 'mod-warning');
		});
	}

	// ── actions ─────────────────────────────────────────────

	private openSettings(): void {
		const setting = (this.app as unknown as { setting?: { open(): void; openTabById(id: string): void } }).setting;
		setting?.open();
		setting?.openTabById(this.plugin.manifest.id);
	}

	private async openNote(note: SharedNote): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(note.filePath);
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf().openFile(file);
		} else {
			new Notice(`File not found: ${note.filePath}`);
		}
	}

	private async confirmDelete(note: SharedNote): Promise<boolean> {
		const modal = new ConfirmDeleteModal(this.app, note);
		modal.open();
		return modal.getResult();
	}

	private async deleteNote(note: SharedNote): Promise<void> {
		const success = await this.plugin.deleteSharedNote(note);
		if (success) {
			new Notice(`Deleted: ${note.title}`);
			await this.render();
		} else {
			new Notice(`Failed to delete: ${note.title}`);
		}
	}

	private showContextMenu(event: MouseEvent, note: SharedNote): void {
		const menu = new Menu();

		menu.addItem(item => item
			.setTitle('Copy link')
			.setIcon('link')
			.onClick(async () => {
				await navigator.clipboard.writeText(note.url);
				new Notice('Link copied');
			}));

		menu.addItem(item => item
			.setTitle('Open in browser')
			.setIcon('external-link')
			.onClick(() => { window.open(note.url, '_blank'); }));

		menu.addItem(item => item
			.setTitle('Open source file')
			.setIcon('file-text')
			.onClick(async () => { await this.openNote(note); }));

		menu.addSeparator();

		menu.addItem(item => item
			.setTitle('Re-share (update)')
			.setIcon('refresh-cw')
			.onClick(async () => {
				const file = this.app.vault.getAbstractFileByPath(note.filePath);
				if (file instanceof TFile) {
					await this.plugin.shareNote(file);
					await this.render();
				}
			}));

		if (note.provider === 'cloud') {
			menu.addItem(item => item
				.setTitle(note.revoked ? 'Restore access' : 'Revoke access')
				.setIcon(note.revoked ? 'eye' : 'eye-off')
				.onClick(async () => {
					const ok = await this.plugin.revokeSharedNote(note, !note.revoked);
					new Notice(ok
						? (note.revoked ? 'Access revoked' : 'Access restored')
						: 'Revoke failed');
					await this.render();
				}));
		}

		menu.addSeparator();

		menu.addItem(item => {
			item
				.setTitle('Delete from server')
				.setIcon('trash-2')
				.onClick(async () => {
					if (await this.confirmDelete(note)) await this.deleteNote(note);
				});
			(item as unknown as { setWarning?: (w: boolean) => void }).setWarning?.(true);
		});

		menu.showAtMouseEvent(event);
	}
}

function compactNumber(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
	return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function relativeTime(ts: number): string {
	const diff = Date.now() - ts;
	const min = Math.round(diff / 60000);
	if (min < 1) return 'just now';
	if (min < 60) return `${min}m ago`;
	const hours = Math.round(min / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function expiresLabel(ts: number): string {
	const diff = ts - Date.now();
	if (diff <= 0) return 'expired';
	const hours = Math.floor(diff / (60 * 60 * 1000));
	if (hours < 1) return 'expires soon';
	if (hours < 24) return `expires in ${hours}h`;
	return `expires in ${Math.floor(hours / 24)}d`;
}

/** Host + path without the protocol or the E2E key fragment. */
function displayUrl(url: string): string {
	const clean = url.split('#')[0].replace(/^https?:\/\//, '');
	return clean.length > 64 ? clean.slice(0, 61) + '…' : clean;
}
