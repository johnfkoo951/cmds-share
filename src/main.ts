import {
	Plugin,
	MarkdownView,
	Notice,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';
import {
	CMDSShareSettings,
	DEFAULT_SETTINGS,
	SharedNote,
	CMS_VIEW_TYPE,
} from './types';
import { ShareApiService } from './api';
import { RemoteNoteMeta } from './providers';
import { CMDSShareSettingTab } from './settings';
import { CMSView } from './cms';
import { ShareOptionsModal, ConfirmDeleteModal, SharedNotesModal } from './modals';
import { generateShortId, sha256 } from './crypto';

export default class CMDSSharePlugin extends Plugin {
	settings: CMDSShareSettings;
	api: ShareApiService;
	private sharedNotes: Map<string, SharedNote> = new Map();

	async onload(): Promise<void> {
		console.log('[CMDS Share] Loading plugin v1.0.0');

		await this.loadSettings();
		this.api = new ShareApiService(this.settings);

		await this.loadSharedNotes();

		this.registerView(CMS_VIEW_TYPE, (leaf) => new CMSView(leaf, this));

		this.addCommand({
			id: 'share-note',
			name: 'Share current note to web',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file) {
					if (!checking) {
						this.shareNote(file);
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: 'delete-shared-note',
			name: 'Delete shared note from server',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && this.isNoteShared(file.path)) {
					if (!checking) {
						this.deleteCurrentSharedNote(file);
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: 'copy-share-link',
			name: 'Copy share link of current note',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && this.isNoteShared(file.path)) {
					if (!checking) {
						this.copyShareLink(file);
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: 'open-cms',
			name: 'Open CMS dashboard',
			callback: () => {
				this.openCMS();
			},
		});

		this.addCommand({
			id: 'browse-shared-notes',
			name: 'Browse all shared notes',
			callback: () => {
				this.browseSharedNotes();
			},
		});

		this.addSettingTab(new CMDSShareSettingTab(this.app, this));

		this.addRibbonIcon('share-2', 'CMDS Share', () => {
			const file = this.app.workspace.getActiveFile();
			if (file) {
				this.shareNote(file);
			} else {
				this.openCMS();
			}
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile && file.extension === 'md') {
					menu.addItem((item) => {
						item
							.setTitle('Share to web')
							.setIcon('share-2')
							.onClick(() => this.shareNote(file));
					});

					if (this.isNoteShared(file.path)) {
						menu.addItem((item) => {
							item
								.setTitle('Copy share link')
								.setIcon('link')
								.onClick(() => this.copyShareLink(file));
						});
					}
				}
			})
		);
	}

	onunload(): void {
		console.log('[CMDS Share] Unloading plugin');
		this.app.workspace.detachLeavesOfType(CMS_VIEW_TYPE);
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		const saved = data?.settings || data || {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		// deep-merge provider configs so new default fields survive old data.json files
		this.settings.providers = { ...DEFAULT_SETTINGS.providers };
		for (const key of Object.keys(DEFAULT_SETTINGS.providers) as (keyof typeof DEFAULT_SETTINGS.providers)[]) {
			this.settings.providers[key] = Object.assign(
				{},
				DEFAULT_SETTINGS.providers[key],
				saved.providers?.[key]
			);
		}

		let dirty = false;
		if (!this.settings.uid) {
			this.settings.uid = generateShortId(16);
			dirty = true;
		}
		if (!this.settings.vaultId) {
			this.settings.vaultId = await this.computeVaultId();
			dirty = true;
		}
		if (!this.settings.vaultName) {
			this.settings.vaultName = this.app.vault.getName();
			dirty = true;
		}
		if (dirty) await this.saveSettings();
	}

	private async computeVaultId(): Promise<string> {
		const adapter = this.app.vault.adapter as { basePath?: string; getBasePath?: () => string };
		const basePath: string = adapter.basePath
			|| adapter.getBasePath?.()
			|| this.app.vault.getName();
		const hash = await sha256(`cmds-share:${basePath}`);
		return hash.slice(0, 16);
	}

	async saveSettings(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			sharedNotes: Object.fromEntries(this.sharedNotes),
		});
		if (this.api) {
			this.api.updateSettings(this.settings);
		}
	}

	private async loadSharedNotes(): Promise<void> {
		const data = await this.loadData();
		if (data?.sharedNotes) {
			this.sharedNotes = new Map(Object.entries(data.sharedNotes));
		}
	}

	private async saveSharedNotes(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			sharedNotes: Object.fromEntries(this.sharedNotes),
		});
	}

	async shareNote(file: TFile): Promise<void> {
		const modal = new ShareOptionsModal(this.app, this.settings);
		modal.open();
		const response = await modal.getResponse();

		if (response.action === 'cancel') {
			return;
		}

		const content = await this.app.vault.read(file);
		const title = this.extractTitle(file, content);

		new Notice(`Sharing: ${title}...`);

		const existing = this.sharedNotes.get(file.path);
		const reuseShortId = existing?.shortId;
		const expiresAt = this.calculateExpiration(response.expiration);

		const result = await this.api.shareNote(file, content, title, this.app, reuseShortId, {
			encrypted: response.encrypted,
			expiresAt,
		});

		if (!result.success) {
			new Notice(`Failed to share: ${result.error}`);
			return;
		}

		const now = Date.now();
		const sharedNote: SharedNote = {
			id: existing?.id || result.shortId || generateShortId(8),
			filePath: file.path,
			url: result.url || '',
			shortId: result.shortId || existing?.shortId || '',
			title,
			status: 'published',
			encrypted: result.encrypted ?? response.encrypted,
			provider: this.settings.activeProvider,
			vaultId: this.settings.vaultId,
			vaultName: this.settings.vaultName,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
			expiresAt,
		};

		this.sharedNotes.set(file.path, sharedNote);
		await this.saveSharedNotes();

		await this.updateFrontmatter(file, sharedNote);

		await navigator.clipboard.writeText(result.url || '');
		new Notice(existing ? 'Re-shared! URL copied' : 'Shared! URL copied to clipboard');
	}

	async deleteSharedNote(note: SharedNote): Promise<boolean> {
		const success = await this.api.deleteNote(note);

		if (success) {
			this.sharedNotes.delete(note.filePath);
			await this.saveSharedNotes();

			const file = this.app.vault.getAbstractFileByPath(note.filePath);
			if (file instanceof TFile) {
				await this.removeFrontmatter(file);
			}
		}

		return success;
	}

	private async deleteCurrentSharedNote(file: TFile): Promise<void> {
		const note = this.sharedNotes.get(file.path);
		if (!note) {
			new Notice('Note is not shared');
			return;
		}

		const modal = new ConfirmDeleteModal(this.app, note);
		modal.open();
		const confirmed = await modal.getResult();

		if (!confirmed) {
			return;
		}

		const success = await this.deleteSharedNote(note);
		if (success) {
			new Notice('Shared note deleted');
		} else {
			new Notice('Failed to delete shared note');
		}
	}

	private copyShareLink(file: TFile): void {
		const note = this.sharedNotes.get(file.path);
		if (!note) {
			new Notice('Note is not shared');
			return;
		}

		navigator.clipboard.writeText(note.url);
		new Notice('Share link copied to clipboard');
	}

	private browseSharedNotes(): void {
		const notes = Array.from(this.sharedNotes.values());
		if (notes.length === 0) {
			new Notice('No shared notes yet');
			return;
		}

		const modal = new SharedNotesModal(this.app, notes, (note) => {
			const file = this.app.vault.getAbstractFileByPath(note.filePath);
			if (file instanceof TFile) {
				this.app.workspace.getLeaf().openFile(file);
			}
		});
		modal.open();
	}

	async openCMS(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(CMS_VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: CMS_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}

	getSharedNotes(): SharedNote[] {
		return Array.from(this.sharedNotes.values());
	}

	/**
	 * Pull the server-side registry (CMDSPACE provider) and merge view counts /
	 * revocation / expiry status into local records. Returns the remote list so
	 * the CMS can surface orphans, or null when the provider can't list.
	 */
	async reconcileSharedNotes(): Promise<RemoteNoteMeta[] | null> {
		const remote = await this.api.listRemoteNotes();
		if (!remote) return null;

		const byShortId = new Map(remote.map(r => [r.shortId, r]));
		let dirty = false;

		for (const note of this.sharedNotes.values()) {
			if (note.provider !== this.settings.activeProvider) continue;
			const r = byShortId.get(note.shortId);
			if (!r) continue;

			const status: SharedNote['status'] = r.revoked
				? 'archived'
				: r.expiresAt && r.expiresAt < Date.now()
					? 'expired'
					: 'published';

			if (note.viewCount !== r.viewCount || note.revoked !== r.revoked || note.status !== status) {
				note.viewCount = r.viewCount;
				note.revoked = r.revoked;
				note.status = status;
				dirty = true;
			}
		}

		if (dirty) await this.saveSharedNotes();
		return remote;
	}

	async revokeSharedNote(note: SharedNote, revoked: boolean): Promise<boolean> {
		const success = await this.api.revokeNote(note.shortId, revoked);
		if (success) {
			note.revoked = revoked;
			note.status = revoked ? 'archived' : 'published';
			this.sharedNotes.set(note.filePath, note);
			await this.saveSharedNotes();
		}
		return success;
	}

	isNoteShared(filePath: string): boolean {
		return this.sharedNotes.has(filePath);
	}

	private extractTitle(file: TFile, content: string): string {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		if (fm?.title && typeof fm.title === 'string') {
			return fm.title;
		}

		const h1Match = content.match(/^#\s+(.+)$/m);
		if (h1Match) {
			return h1Match[1].trim();
		}

		return file.basename;
	}

	private calculateExpiration(expiration: string): number | undefined {
		if (!expiration) return undefined;

		const now = Date.now();
		const durations: Record<string, number> = {
			'1 hour': 60 * 60 * 1000,
			'1 day': 24 * 60 * 60 * 1000,
			'7 days': 7 * 24 * 60 * 60 * 1000,
			'30 days': 30 * 24 * 60 * 60 * 1000,
			'90 days': 90 * 24 * 60 * 60 * 1000,
		};

		const duration = durations[expiration];
		return duration ? now + duration : undefined;
	}

	private async updateFrontmatter(file: TFile, note: SharedNote): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter[this.settings.shareField] = true;
			frontmatter[this.settings.linkField] = note.url;
			
			if (note.encrypted) {
				frontmatter[this.settings.encryptedField] = true;
			}
			
			if (note.expiresAt) {
				frontmatter[this.settings.expiresField] = new Date(note.expiresAt).toISOString();
			}
		});
	}

	private async removeFrontmatter(file: TFile): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			delete frontmatter[this.settings.shareField];
			delete frontmatter[this.settings.linkField];
			delete frontmatter[this.settings.encryptedField];
			delete frontmatter[this.settings.expiresField];
		});
	}
}
