import { MarkdownView, Notice, TFile, setIcon } from 'obsidian';
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

/** Force a redraw (e.g. after revoke/restore changes which buttons apply). */
export function refreshLinkFieldActions(plugin: CMDSSharePlugin): void {
	activeDocument.querySelectorAll(`.${ACTIONS_CLS}`).forEach(el => el.remove());
	injectAll(plugin);
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
