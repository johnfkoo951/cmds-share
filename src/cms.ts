import { 
	ItemView, 
	WorkspaceLeaf, 
	Notice,
	Menu,
	TFile,
} from 'obsidian';
import type CMDSSharePlugin from './main';
import { 
	CMS_VIEW_TYPE, 
	SharedNote, 
	CMSStats,
	PROVIDER_DISPLAY_NAMES,
} from './types';

export class CMSView extends ItemView {
	plugin: CMDSSharePlugin;
	private refreshInterval: ReturnType<typeof setInterval> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CMDSSharePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return CMS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'CMDS Share CMS';
	}

	getIcon(): string {
		return 'globe';
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
		this.refreshInterval = setInterval(() => {
			this.render();
		}, 60000);
	}

	private stopAutoRefresh(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}
	}

	async render(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('cmds-share-cms');

		const notes = this.plugin.getSharedNotes();
		const stats = this.calculateStats(notes);

		this.renderHeader(container, stats);
		this.renderStats(container, stats);
		this.renderNotesList(container, notes);
	}

	private calculateStats(notes: SharedNote[]): CMSStats {
		const byProvider: Record<string, number> = {
			cloud: 0,
			synology: 0,
			github: 0,
			supabase: 0,
			convex: 0,
		};

		notes.forEach(note => {
			byProvider[note.provider] = (byProvider[note.provider] || 0) + 1;
		});

		return {
			totalNotes: notes.length,
			publishedNotes: notes.filter(n => n.status === 'published').length,
			encryptedNotes: notes.filter(n => n.encrypted).length,
			totalViews: notes.reduce((sum, n) => sum + (n.viewCount || 0), 0),
			byProvider: byProvider as CMSStats['byProvider'],
		};
	}

	private renderHeader(container: Element, stats: CMSStats): void {
		const header = container.createDiv({ cls: 'cmds-share-cms-header' });

		const titleRow = header.createDiv({ cls: 'cmds-share-cms-title-row' });
		titleRow.createEl('h2', { text: 'Shared Notes' });

		const actions = titleRow.createDiv({ cls: 'cmds-share-cms-actions' });

		const refreshBtn = actions.createEl('button', { 
			text: 'Refresh',
			cls: 'cmds-share-cms-btn'
		});
		refreshBtn.addEventListener('click', () => this.render());

		const provider = this.plugin.settings.activeProvider;
		const providerBadge = header.createDiv({ cls: 'cmds-share-cms-provider-badge' });
		providerBadge.createSpan({ text: `Provider: ${PROVIDER_DISPLAY_NAMES[provider]}` });
	}

	private renderStats(container: Element, stats: CMSStats): void {
		const statsContainer = container.createDiv({ cls: 'cmds-share-cms-stats' });

		const statItems = [
			{ label: 'Total', value: stats.totalNotes.toString(), icon: '📄' },
			{ label: 'Published', value: stats.publishedNotes.toString(), icon: '🌐' },
			{ label: 'Encrypted', value: stats.encryptedNotes.toString(), icon: '🔒' },
			{ label: 'Views', value: stats.totalViews.toString(), icon: '👁️' },
		];

		statItems.forEach(item => {
			const stat = statsContainer.createDiv({ cls: 'cmds-share-cms-stat' });
			stat.createSpan({ text: item.icon, cls: 'cmds-share-cms-stat-icon' });
			stat.createSpan({ text: item.value, cls: 'cmds-share-cms-stat-value' });
			stat.createSpan({ text: item.label, cls: 'cmds-share-cms-stat-label' });
		});
	}

	private renderNotesList(container: Element, notes: SharedNote[]): void {
		const listContainer = container.createDiv({ cls: 'cmds-share-cms-list' });

		if (notes.length === 0) {
			const emptyState = listContainer.createDiv({ cls: 'cmds-share-cms-empty' });
			emptyState.createEl('p', { text: 'No shared notes yet.' });
			emptyState.createEl('p', { 
				text: 'Use the "Share note" command to share your first note.',
				cls: 'cmds-share-cms-empty-hint'
			});
			return;
		}

		const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

		sortedNotes.forEach(note => {
			this.renderNoteItem(listContainer, note);
		});
	}

	private renderNoteItem(container: Element, note: SharedNote): void {
		const item = container.createDiv({ cls: 'cmds-share-cms-item' });

		const mainRow = item.createDiv({ cls: 'cmds-share-cms-item-main' });

		const titleContainer = mainRow.createDiv({ cls: 'cmds-share-cms-item-title-container' });
		
		const titleLink = titleContainer.createEl('a', { 
			text: note.title,
			cls: 'cmds-share-cms-item-title',
			href: '#'
		});
		titleLink.addEventListener('click', async (e) => {
			e.preventDefault();
			await this.openNote(note);
		});

		if (note.encrypted) {
			titleContainer.createSpan({ text: ' 🔒', cls: 'cmds-share-cms-encrypted-badge' });
		}

		const statusBadge = mainRow.createSpan({ 
			text: note.status,
			cls: `cmds-share-cms-status cmds-share-cms-status-${note.status}`
		});

		const metaRow = item.createDiv({ cls: 'cmds-share-cms-item-meta' });
		metaRow.createSpan({ text: PROVIDER_DISPLAY_NAMES[note.provider] });
		metaRow.createSpan({ text: ' • ' });
		metaRow.createSpan({ text: this.formatDate(note.updatedAt) });
		
		if (note.viewCount !== undefined) {
			metaRow.createSpan({ text: ` • ${note.viewCount} views` });
		}

		if (note.expiresAt) {
			const expiresIn = this.formatExpiresIn(note.expiresAt);
			if (expiresIn) {
				metaRow.createSpan({ text: ` • Expires ${expiresIn}` });
			}
		}

		const urlRow = item.createDiv({ cls: 'cmds-share-cms-item-url' });
		const urlLink = urlRow.createEl('a', {
			text: this.truncateUrl(note.url),
			href: note.url,
		});
		urlLink.setAttr('target', '_blank');

		const actionsRow = item.createDiv({ cls: 'cmds-share-cms-item-actions' });

		const copyBtn = actionsRow.createEl('button', { 
			text: 'Copy URL',
			cls: 'cmds-share-cms-btn cmds-share-cms-btn-small'
		});
		copyBtn.addEventListener('click', async () => {
			await navigator.clipboard.writeText(note.url);
			new Notice('URL copied to clipboard');
		});

		const openBtn = actionsRow.createEl('button', { 
			text: 'Open',
			cls: 'cmds-share-cms-btn cmds-share-cms-btn-small'
		});
		openBtn.addEventListener('click', () => {
			window.open(note.url, '_blank');
		});

		const deleteBtn = actionsRow.createEl('button', { 
			text: 'Delete',
			cls: 'cmds-share-cms-btn cmds-share-cms-btn-small cmds-share-cms-btn-danger'
		});
		deleteBtn.addEventListener('click', async () => {
			const confirmed = await this.confirmDelete(note);
			if (confirmed) {
				await this.deleteNote(note);
			}
		});

		item.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showContextMenu(e, note);
		});
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
		return new Promise(resolve => {
			const notice = new Notice(
				`Delete "${note.title}" from server? Click to confirm.`,
				5000
			);
			
			const noticeEl = (notice as unknown as { noticeEl: HTMLElement }).noticeEl;
			noticeEl.style.cursor = 'pointer';
			noticeEl.onclick = () => {
				notice.hide();
				resolve(true);
			};
			
			setTimeout(() => resolve(false), 5000);
		});
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

		menu.addItem(item => {
			item
				.setTitle('Copy URL')
				.setIcon('link')
				.onClick(async () => {
					await navigator.clipboard.writeText(note.url);
					new Notice('URL copied');
				});
		});

		menu.addItem(item => {
			item
				.setTitle('Open in browser')
				.setIcon('external-link')
				.onClick(() => {
					window.open(note.url, '_blank');
				});
		});

		menu.addItem(item => {
			item
				.setTitle('Open source note')
				.setIcon('file-text')
				.onClick(async () => {
					await this.openNote(note);
				});
		});

		menu.addSeparator();

		menu.addItem(item => {
			item
				.setTitle('Re-share (update)')
				.setIcon('refresh-cw')
				.onClick(async () => {
					const file = this.app.vault.getAbstractFileByPath(note.filePath);
					if (file instanceof TFile) {
						await this.plugin.shareNote(file);
						await this.render();
					}
				});
		});

		menu.addSeparator();

		menu.addItem(item => {
			item
				.setTitle('Delete from server')
				.setIcon('trash')
				.onClick(async () => {
					const confirmed = await this.confirmDelete(note);
					if (confirmed) {
						await this.deleteNote(note);
					}
				});
		});

		menu.showAtMouseEvent(event);
	}

	private formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}

	private formatExpiresIn(timestamp: number): string | null {
		const now = Date.now();
		const diff = timestamp - now;
		
		if (diff <= 0) return 'expired';
		
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(hours / 24);
		
		if (days > 0) return `in ${days} days`;
		if (hours > 0) return `in ${hours} hours`;
		return 'soon';
	}

	private truncateUrl(url: string): string {
		if (url.length <= 60) return url;
		
		const hashIndex = url.indexOf('#');
		const cleanUrl = hashIndex > 0 ? url.slice(0, hashIndex) : url;
		
		if (cleanUrl.length <= 60) return cleanUrl;
		return cleanUrl.slice(0, 57) + '...';
	}
}
