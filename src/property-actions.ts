import { FileView, MarkdownView, Menu, Notice, TFile, View, setIcon } from 'obsidian';
import type CMDSSharePlugin from './main';

/**
 * Action buttons next to the share-link property (re-share · copy · unshare),
 * like the Properties affordance other share plugins offer. Obsidian re-renders
 * the properties block freely, so injection is idempotent and retried briefly
 * after each file open / metadata change.
 */
const ACTIONS_CLS = 'cmds-share-link-actions';
const OWNED_ROW_CLS = 'cmds-share-owned-link';

export function registerLinkFieldActions(plugin: CMDSSharePlugin): void {
	let observer: MutationObserver | null = null;
	let stopTimer: number | null = null;

	const refresh = () => {
		injectAll(plugin);
		// the properties widget may render after this tick — watch briefly
		observer?.disconnect();
		if (stopTimer) window.clearTimeout(stopTimer);
		observer = new MutationObserver(() => injectAll(plugin));
		observer.observe(activeDocument.body, { childList: true, subtree: true });
		stopTimer = window.setTimeout(() => observer?.disconnect(), 1500);
	};

	plugin.registerEvent(plugin.app.workspace.on('file-open', refresh));
	plugin.registerEvent(plugin.app.workspace.on('layout-change', refresh));
	plugin.registerEvent(plugin.app.metadataCache.on('changed', (file) => {
		if (file.path === plugin.app.workspace.getActiveFile()?.path) refresh();
	}));
	plugin.register(() => {
		observer?.disconnect();
		if (stopTimer) window.clearTimeout(stopTimer);
		activeDocument.querySelectorAll(`.${ACTIONS_CLS}`).forEach(el => el.remove());
		activeDocument.querySelectorAll(`.${OWNED_ROW_CLS}`).forEach(el => el.removeClass(OWNED_ROW_CLS));
	});
	plugin.app.workspace.onLayoutReady(refresh);
}

/** Force a redraw (e.g. after a share, revoke/restore or delete changes which buttons apply). */
export function refreshLinkFieldActions(plugin: CMDSSharePlugin): void {
	activeDocument.querySelectorAll(`.${ACTIONS_CLS}`).forEach(el => el.remove());
	injectAll(plugin);
	syncViewActions(plugin);
}


// ═══ View-header share button ═══
// Bases and canvases have no frontmatter to hold the link, so every view of a
// shared file — notes included — gets a header button with its URL and actions.

const VIEW_ACTION_CLS = 'cmds-share-view-action';
const viewActions = new WeakMap<View, { el: HTMLElement; state: string }>();

export function registerViewShareActions(plugin: CMDSSharePlugin): void {
	const sync = () => syncViewActions(plugin);
	plugin.registerEvent(plugin.app.workspace.on('file-open', sync));
	plugin.registerEvent(plugin.app.workspace.on('layout-change', sync));
	plugin.register(() => {
		plugin.app.workspace.iterateAllLeaves(leaf => {
			viewActions.get(leaf.view)?.el.remove();
			viewActions.delete(leaf.view);
		});
	});
	plugin.app.workspace.onLayoutReady(sync);
}

function syncViewActions(plugin: CMDSSharePlugin): void {
	plugin.app.workspace.iterateAllLeaves(leaf => {
		const view = leaf.view;
		if (!(view instanceof FileView)) return;
		const note = view.file ? plugin.getSharedNote(view.file.path) : undefined;
		// state key: rebuild only when the file or its share state changed
		const state = note && view.file ? `${view.file.path}|${note.url}|${note.revoked ? 1 : 0}` : '';
		const current = viewActions.get(view);
		if (current?.state === state) return;
		current?.el.remove();
		viewActions.delete(view);
		if (!note || !view.file) return;

		const file = view.file;
		const label = note.revoked ? `Unshared (restorable): ${note.url}` : `Shared: ${note.url}`;
		const el = view.addAction(note.revoked ? 'eye-off' : 'globe', label, (evt) => {
			showShareMenu(plugin, file, evt);
		});
		el.addClass(VIEW_ACTION_CLS);
		if (note.revoked) el.addClass('is-revoked');
		viewActions.set(view, { el, state });
	});
}

function showShareMenu(plugin: CMDSSharePlugin, file: TFile, evt: MouseEvent): void {
	const note = plugin.getSharedNote(file.path);
	if (!note) return;
	const menu = new Menu();
	menu.addItem(item => item
		.setTitle(note.url)
		.setIcon(note.revoked ? 'eye-off' : 'globe')
		.setDisabled(true));
	menu.addSeparator();
	menu.addItem(item => item
		.setTitle('Open shared page')
		.setIcon('external-link')
		.onClick(() => { window.open(note.url); }));
	menu.addItem(item => item
		.setTitle('Copy share link')
		.setIcon('copy')
		.onClick(async () => {
			await navigator.clipboard.writeText(note.url);
			new Notice('Share link copied');
		}));
	menu.addItem(item => item
		.setTitle('Re-share (update page)')
		.setIcon('upload-cloud')
		.onClick(() => { void plugin.shareNote(file); }));
	menu.addSeparator();
	if (note.revoked) {
		menu.addItem(item => item
			.setTitle('Restore access')
			.setIcon('eye')
			.onClick(() => { void plugin.setShareState(file, true); }));
	} else {
		menu.addItem(item => item
			.setTitle('Unshare')
			.setIcon('unlink')
			.setWarning(true)
			.onClick(() => { void plugin.setShareState(file, false); }));
	}
	menu.showAtMouseEvent(evt);
}

function injectAll(plugin: CMDSSharePlugin): void {
	const field = plugin.settings.linkField;
	for (const leaf of plugin.app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (!(view instanceof MarkdownView) || !view.file) continue;
		const note = plugin.getSharedNote(view.file.path);
		view.containerEl
			.querySelectorAll<HTMLElement>(`div.metadata-property[data-property-key="${CSS.escape(field)}"]`)
			.forEach(row => {
				if (!note) {
					row.removeClass(OWNED_ROW_CLS);
					row.querySelector(`.${ACTIONS_CLS}`)?.remove();
					return;
				}
				row.addClass(OWNED_ROW_CLS);
				const valueEl = row.querySelector<HTMLElement>('div.metadata-property-value');
				if (!valueEl || valueEl.querySelector(`.${ACTIONS_CLS}`)) return;
				buildActions(plugin, view.file as TFile, valueEl);
			});
	}
}

function buildActions(plugin: CMDSSharePlugin, file: TFile, valueEl: HTMLElement): void {
	const note = plugin.getSharedNote(file.path);
	if (!note) return;
	const bar = createDiv({ cls: ACTIONS_CLS });
	valueEl.prepend(bar);

	const button = (icon: string, label: string, onClick: () => void | Promise<void>, cls = '') => {
		const btn = bar.createSpan({ cls: `clickable-icon ${cls}`, attr: { 'aria-label': label, role: 'button', tabindex: '0' } });
		setIcon(btn, icon);
		plugin.registerDomEvent(btn, 'click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void onClick();
		});
	};

	button('upload-cloud', 'Re-share (CMDS Share)', () => plugin.shareNote(file));
	button('copy', 'Copy share link', async () => {
		const current = plugin.getSharedNote(file.path);
		if (!current) return;
		await navigator.clipboard.writeText(current.url);
		new Notice('Share link copied');
	});
	if (note.revoked) {
		button('eye', 'Restore access', () => plugin.setShareState(file, true), 'mod-restore');
	} else {
		button('unlink', 'Unshare', () => plugin.setShareState(file, false), 'mod-warning');
	}
}
