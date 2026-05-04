import {
	App,
	Modal,
	Setting,
	FuzzySuggestModal,
	TFile,
} from 'obsidian';
import { CMDSShareSettings, SharedNote, ServerProviderType, PROVIDER_DISPLAY_NAMES } from './types';

export interface ShareOptionsResponse {
	action: 'share' | 'cancel';
	encrypted: boolean;
	expiration: string;
}

export class ShareOptionsModal extends Modal {
	private settings: CMDSShareSettings;
	private response: Partial<ShareOptionsResponse> = {};
	private resolvePromise?: (value: ShareOptionsResponse) => void;

	constructor(app: App, settings: CMDSShareSettings) {
		super(app);
		this.settings = settings;
		this.response.encrypted = settings.encryptionMode === 'always';
		this.response.expiration = settings.defaultExpiration;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cmds-share-options-modal');

		contentEl.createEl('h2', { text: 'Share Note' });

		const providerName = PROVIDER_DISPLAY_NAMES[this.settings.activeProvider];
		contentEl.createEl('p', { 
			text: `Sharing to: ${providerName}`,
			cls: 'cmds-share-provider-info'
		});

		new Setting(contentEl)
			.setName('Encrypt note')
			.setDesc('End-to-end encryption - only people with the link can read')
			.addToggle(toggle => toggle
				.setValue(this.response.encrypted || false)
				.onChange(value => {
					this.response.encrypted = value;
				}));

		new Setting(contentEl)
			.setName('Expiration')
			.setDesc('Auto-delete after this time')
			.addDropdown(dropdown => dropdown
				.addOption('', 'Never')
				.addOption('1 hour', '1 hour')
				.addOption('1 day', '1 day')
				.addOption('7 days', '7 days')
				.addOption('30 days', '30 days')
				.setValue(this.response.expiration || '')
				.onChange(value => {
					this.response.expiration = value;
				}));

		const buttonContainer = contentEl.createDiv({ cls: 'cmds-share-buttons' });

		buttonContainer.createEl('button', { text: 'Cancel' })
			.addEventListener('click', () => {
				this.response.action = 'cancel';
				this.close();
			});

		const shareBtn = buttonContainer.createEl('button', { text: 'Share', cls: 'mod-cta' });
		shareBtn.addEventListener('click', () => {
			this.response.action = 'share';
			this.close();
		});
	}

	onClose(): void {
		if (this.resolvePromise) {
			this.resolvePromise({
				action: this.response.action ?? 'cancel',
				encrypted: this.response.encrypted ?? false,
				expiration: this.response.expiration ?? '',
			});
		}
	}

	getResponse(): Promise<ShareOptionsResponse> {
		return new Promise(resolve => {
			this.resolvePromise = resolve;
		});
	}
}

export class SharedNotesModal extends FuzzySuggestModal<SharedNote> {
	private notes: SharedNote[];
	private onSelect: (note: SharedNote) => void;

	constructor(app: App, notes: SharedNote[], onSelect: (note: SharedNote) => void) {
		super(app);
		this.notes = notes;
		this.onSelect = onSelect;
		this.setPlaceholder('Search shared notes...');
	}

	getItems(): SharedNote[] {
		return this.notes;
	}

	getItemText(note: SharedNote): string {
		return `${note.title} (${note.filePath})`;
	}

	onChooseItem(note: SharedNote): void {
		this.onSelect(note);
	}

	renderSuggestion(match: { item: SharedNote }, el: HTMLElement): void {
		const note = match.item;
		const container = el.createDiv({ cls: 'cmds-share-suggestion' });

		const titleDiv = container.createDiv({ cls: 'cmds-share-suggestion-title' });
		titleDiv.createSpan({ text: note.title });
		if (note.encrypted) {
			titleDiv.createSpan({ text: ' 🔒', cls: 'cmds-share-encrypted-icon' });
		}

		const metaDiv = container.createDiv({ cls: 'cmds-share-suggestion-meta' });
		metaDiv.createSpan({ text: PROVIDER_DISPLAY_NAMES[note.provider] });
		metaDiv.createSpan({ text: ' • ' });
		metaDiv.createSpan({ text: this.formatDate(note.updatedAt) });
		if (note.viewCount !== undefined) {
			metaDiv.createSpan({ text: ` • ${note.viewCount} views` });
		}
	}

	private formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString();
	}
}

export class ConfirmDeleteModal extends Modal {
	private note: SharedNote;
	private resolvePromise?: (confirmed: boolean) => void;

	constructor(app: App, note: SharedNote) {
		super(app);
		this.note = note;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('cmds-share-confirm-modal');

		contentEl.createEl('h2', { text: 'Delete Shared Note' });
		contentEl.createEl('p', { 
			text: `Are you sure you want to delete "${this.note.title}" from the server?`
		});
		contentEl.createEl('p', {
			text: 'This will make the shared link inaccessible.',
			cls: 'cmds-share-warning'
		});

		const buttonContainer = contentEl.createDiv({ cls: 'cmds-share-buttons' });

		buttonContainer.createEl('button', { text: 'Cancel' })
			.addEventListener('click', () => {
				this.resolvePromise?.(false);
				this.close();
			});

		const deleteBtn = buttonContainer.createEl('button', { text: 'Delete', cls: 'mod-warning' });
		deleteBtn.addEventListener('click', () => {
			this.resolvePromise?.(true);
			this.close();
		});
	}

	onClose(): void {
		if (this.resolvePromise) {
			this.resolvePromise(false);
		}
	}

	getResult(): Promise<boolean> {
		return new Promise(resolve => {
			this.resolvePromise = resolve;
		});
	}
}

export class ProviderSelectorModal extends FuzzySuggestModal<ServerProviderType> {
	private providers: ServerProviderType[];
	private onSelect: (provider: ServerProviderType) => void;

	constructor(app: App, providers: ServerProviderType[], onSelect: (provider: ServerProviderType) => void) {
		super(app);
		this.providers = providers;
		this.onSelect = onSelect;
		this.setPlaceholder('Select server provider...');
	}

	getItems(): ServerProviderType[] {
		return this.providers;
	}

	getItemText(provider: ServerProviderType): string {
		return PROVIDER_DISPLAY_NAMES[provider];
	}

	onChooseItem(provider: ServerProviderType): void {
		this.onSelect(provider);
	}
}
