import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type CMDSSharePlugin from './main';
import { 
	ServerProviderType, 
	PROVIDER_DISPLAY_NAMES, 
	SUPPORTED_PROVIDERS,
	EXPIRATION_OPTIONS,
} from './types';

export class CMDSShareSettingTab extends PluginSettingTab {
	plugin: CMDSSharePlugin;

	constructor(app: App, plugin: CMDSSharePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'CMDS Share Settings' });

		// Vault Identity
		containerEl.createEl('h3', { text: 'Vault Identity' });

		new Setting(containerEl)
			.setName('Vault display name')
			.setDesc('Shown in CMS to distinguish notes from different vaults')
			.addText(text => text
				.setPlaceholder('e.g. CMDS Local')
				.setValue(this.plugin.settings.vaultName)
				.onChange(async (value) => {
					this.plugin.settings.vaultName = value || this.plugin.app.vault.getName();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Vault ID')
			.setDesc('Auto-generated. Used to group shares from this vault server-side.')
			.addText(text => text
				.setValue(this.plugin.settings.vaultId)
				.setDisabled(true));

		// Provider Selection
		containerEl.createEl('h3', { text: 'Server Provider' });

		new Setting(containerEl)
			.setName('Active provider')
			.setDesc('Select which server to use for sharing notes')
			.addDropdown(dropdown => {
				SUPPORTED_PROVIDERS.forEach(provider => {
					dropdown.addOption(provider, PROVIDER_DISPLAY_NAMES[provider]);
				});
				dropdown
					.setValue(this.plugin.settings.activeProvider)
					.onChange(async (value: ServerProviderType) => {
						this.plugin.settings.activeProvider = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		// Provider-specific settings
		this.renderProviderSettings(containerEl);

		// Sharing Options
		containerEl.createEl('h3', { text: 'Sharing Options' });

		new Setting(containerEl)
			.setName('Encryption mode')
			.setDesc('When to encrypt shared notes')
			.addDropdown(dropdown => dropdown
				.addOption('auto', 'Auto (based on frontmatter)')
				.addOption('always', 'Always encrypt')
				.addOption('never', 'Never encrypt')
				.setValue(this.plugin.settings.encryptionMode)
				.onChange(async (value) => {
					this.plugin.settings.encryptionMode = value as 'auto' | 'always' | 'never';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default expiration')
			.setDesc('Default expiration time for shared notes')
			.addDropdown(dropdown => {
				EXPIRATION_OPTIONS.forEach(opt => {
					dropdown.addOption(opt.value, opt.label);
				});
				dropdown
					.setValue(this.plugin.settings.defaultExpiration)
					.onChange(async (value) => {
						this.plugin.settings.defaultExpiration = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Include theme CSS')
			.setDesc('Upload current Obsidian theme CSS with shared notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeTheme)
				.onChange(async (value) => {
					this.plugin.settings.includeTheme = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Remove backlinks')
			.setDesc('Remove backlinks section from shared notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeBacklinks)
				.onChange(async (value) => {
					this.plugin.settings.removeBacklinks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Remove frontmatter')
			.setDesc('Remove YAML frontmatter from shared notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.removeFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.removeFrontmatter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note width')
			.setDesc('Maximum width of shared notes')
			.addText(text => text
				.setPlaceholder('750px')
				.setValue(this.plugin.settings.noteWidth)
				.onChange(async (value) => {
					this.plugin.settings.noteWidth = value || '750px';
					await this.plugin.saveSettings();
				}));

		// Frontmatter Fields
		containerEl.createEl('h3', { text: 'Frontmatter Fields' });

		new Setting(containerEl)
			.setName('Share field')
			.setDesc('Frontmatter field to check for share status')
			.addText(text => text
				.setPlaceholder('share')
				.setValue(this.plugin.settings.shareField)
				.onChange(async (value) => {
					this.plugin.settings.shareField = value || 'share';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Link field')
			.setDesc('Frontmatter field to store share link')
			.addText(text => text
				.setPlaceholder('share_link')
				.setValue(this.plugin.settings.linkField)
				.onChange(async (value) => {
					this.plugin.settings.linkField = value || 'share_link';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Encrypted field')
			.setDesc('Frontmatter field to indicate encryption')
			.addText(text => text
				.setPlaceholder('share_encrypted')
				.setValue(this.plugin.settings.encryptedField)
				.onChange(async (value) => {
					this.plugin.settings.encryptedField = value || 'share_encrypted';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Expires field')
			.setDesc('Frontmatter field to store expiration date')
			.addText(text => text
				.setPlaceholder('share_expires')
				.setValue(this.plugin.settings.expiresField)
				.onChange(async (value) => {
					this.plugin.settings.expiresField = value || 'share_expires';
					await this.plugin.saveSettings();
				}));

		// CMS Settings
		containerEl.createEl('h3', { text: 'CMS Dashboard' });

		new Setting(containerEl)
			.setName('Enable CMS dashboard')
			.setDesc('Show CMS dashboard for managing shared notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCMS)
				.onChange(async (value) => {
					this.plugin.settings.enableCMS = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto refresh')
			.setDesc('Automatically refresh CMS dashboard')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.cmsAutoRefresh)
				.onChange(async (value) => {
					this.plugin.settings.cmsAutoRefresh = value;
					await this.plugin.saveSettings();
				}));

		// Debug
		containerEl.createEl('h3', { text: 'Advanced' });

		new Setting(containerEl)
			.setName('Debug mode')
			.setDesc('Enable debug logging')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));

		// Footer
		containerEl.createEl('hr', { attr: { style: 'margin: 24px 0; border: none; border-top: 1px solid var(--background-modifier-border);' } });
		
		const footerEl = containerEl.createEl('div', { attr: { style: 'text-align: center; color: var(--text-muted); font-size: 12px;' } });
		footerEl.createEl('div', { text: `CMDS Share v${this.plugin.manifest.version}`, attr: { style: 'margin-bottom: 8px;' } });
		
		const linksEl = footerEl.createEl('div');
		linksEl.createSpan({ text: 'CMDSPACE ' });
		const eduLink = linksEl.createEl('a', { text: 'Education', href: 'https://class.cmdspace.kr/' });
		eduLink.setAttr('target', '_blank');
		linksEl.createSpan({ text: ' · ' });
		const ghLink = linksEl.createEl('a', { text: 'GitHub', href: 'https://github.com/johnfkoo951/cmds-share' });
		ghLink.setAttr('target', '_blank');
	}

	private renderProviderSettings(containerEl: HTMLElement): void {
		const provider = this.plugin.settings.activeProvider;
		const providerContainer = containerEl.createDiv({ cls: 'cmds-share-provider-settings' });

		switch (provider) {
			case 'cloud':
				this.renderCloudSettings(providerContainer);
				break;
			case 'synology':
				this.renderSynologySettings(providerContainer);
				break;
			case 'github':
				this.renderGitHubSettings(providerContainer);
				break;
			case 'supabase':
				this.renderSupabaseSettings(providerContainer);
				break;
			case 'convex':
				this.renderConvexSettings(providerContainer);
				break;
		}
	}

	private renderCloudSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'CMDSPACE Settings' });

		const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
		infoEl.style.marginBottom = '12px';
		infoEl.innerHTML = `
			<p style="margin: 0 0 8px 0;">CMDSPACE governance server — server-side share registry with view counts, expiry, and revocation. Paste your API token and enable.</p>
		`;

		new Setting(containerEl)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.providers.cloud.enabled)
				.onChange(async (value) => {
					this.plugin.settings.providers.cloud.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API token')
			.setDesc('Token issued for this device (x-cmds-token)')
			.addText(text => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('your-token')
					.setValue(this.plugin.settings.providers.cloud.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.providers.cloud.apiKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Server URL')
			.setDesc('Governance server endpoint (also the public share URL base)')
			.addText(text => text
				.setPlaceholder('https://share.cmdspace.work')
				.setValue(this.plugin.settings.providers.cloud.apiUrl)
				.onChange(async (value) => {
					const url = value.trim().replace(/\/$/, '') || 'https://share.cmdspace.work';
					this.plugin.settings.providers.cloud.apiUrl = url;
					this.plugin.settings.providers.cloud.publicUrl = url;
					await this.plugin.saveSettings();
				}));

		this.addTestConnectionButton(containerEl);
	}

	private renderSynologySettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'Synology NAS Settings' });

		const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
		infoEl.style.marginBottom = '12px';
		infoEl.innerHTML = `
			<p style="margin: 0 0 8px 0;">Host shared notes on your Synology NAS via WebDAV.</p>
		`;

		new Setting(containerEl)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.providers.synology.enabled)
				.onChange(async (value) => {
					this.plugin.settings.providers.synology.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('NAS URL')
			.setDesc('WebDAV endpoint URL')
			.addText(text => text
				.setPlaceholder('https://nas.example.com:5006')
				.setValue(this.plugin.settings.providers.synology.nasUrl)
				.onChange(async (value) => {
					this.plugin.settings.providers.synology.nasUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Username')
			.addText(text => text
				.setValue(this.plugin.settings.providers.synology.username)
				.onChange(async (value) => {
					this.plugin.settings.providers.synology.username = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Password')
			.addText(text => {
				text.inputEl.type = 'password';
				text
					.setValue(this.plugin.settings.providers.synology.password)
					.onChange(async (value) => {
						this.plugin.settings.providers.synology.password = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Shared folder')
			.setDesc('Path on NAS to store shared notes')
			.addText(text => text
				.setPlaceholder('/web/shared-notes')
				.setValue(this.plugin.settings.providers.synology.sharedFolder)
				.onChange(async (value) => {
					this.plugin.settings.providers.synology.sharedFolder = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Public URL')
			.setDesc('Public URL for accessing shared notes')
			.addText(text => text
				.setPlaceholder('https://notes.example.com')
				.setValue(this.plugin.settings.providers.synology.publicUrl)
				.onChange(async (value) => {
					this.plugin.settings.providers.synology.publicUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		this.addTestConnectionButton(containerEl);
	}

	private renderGitHubSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'GitHub Pages Settings' });

		const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
		infoEl.style.marginBottom = '12px';
		infoEl.innerHTML = `
			<p style="margin: 0 0 8px 0;">Host shared notes on GitHub Pages (free hosting).</p>
			<ol style="margin: 0; padding-left: 20px;">
				<li>Create a repository for your shared notes</li>
				<li>Enable GitHub Pages in repo settings</li>
				<li>Generate a personal access token with repo scope</li>
			</ol>
		`;

		new Setting(containerEl)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.providers.github.enabled)
				.onChange(async (value) => {
					this.plugin.settings.providers.github.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Personal access token')
			.setDesc('GitHub token with repo scope')
			.addText(text => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('ghp_xxxx')
					.setValue(this.plugin.settings.providers.github.token)
					.onChange(async (value) => {
						this.plugin.settings.providers.github.token = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Repository')
			.setDesc('owner/repo format')
			.addText(text => text
				.setPlaceholder('username/shared-notes')
				.setValue(this.plugin.settings.providers.github.repo)
				.onChange(async (value) => {
					this.plugin.settings.providers.github.repo = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Branch')
			.addText(text => text
				.setPlaceholder('gh-pages')
				.setValue(this.plugin.settings.providers.github.branch)
				.onChange(async (value) => {
					this.plugin.settings.providers.github.branch = value.trim() || 'gh-pages';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Path')
			.setDesc('Directory in repo for notes')
			.addText(text => text
				.setPlaceholder('notes')
				.setValue(this.plugin.settings.providers.github.path)
				.onChange(async (value) => {
					this.plugin.settings.providers.github.path = value.trim() || 'notes';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Custom domain')
			.setDesc('Optional custom domain for GitHub Pages')
			.addText(text => text
				.setPlaceholder('notes.example.com')
				.setValue(this.plugin.settings.providers.github.customDomain || '')
				.onChange(async (value) => {
					this.plugin.settings.providers.github.customDomain = value.trim();
					await this.plugin.saveSettings();
				}));

		this.addTestConnectionButton(containerEl);
	}

	private renderSupabaseSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'Supabase Settings' });

		const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
		infoEl.style.marginBottom = '12px';
		infoEl.innerHTML = `
			<p style="margin: 0 0 8px 0;">Host shared notes on Supabase Storage.</p>
			<ol style="margin: 0; padding-left: 20px;">
				<li>Create a Supabase project</li>
				<li>Create a public storage bucket</li>
				<li>Copy project URL and anon key from settings</li>
			</ol>
		`;

		new Setting(containerEl)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.providers.supabase.enabled)
				.onChange(async (value) => {
					this.plugin.settings.providers.supabase.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Project URL')
			.addText(text => text
				.setPlaceholder('https://xxx.supabase.co')
				.setValue(this.plugin.settings.providers.supabase.projectUrl)
				.onChange(async (value) => {
					this.plugin.settings.providers.supabase.projectUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Anon key')
			.addText(text => {
				text.inputEl.type = 'password';
				text
					.setPlaceholder('eyJhbGc...')
					.setValue(this.plugin.settings.providers.supabase.anonKey)
					.onChange(async (value) => {
						this.plugin.settings.providers.supabase.anonKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Bucket')
			.setDesc('Storage bucket name')
			.addText(text => text
				.setPlaceholder('shared-notes')
				.setValue(this.plugin.settings.providers.supabase.bucket)
				.onChange(async (value) => {
					this.plugin.settings.providers.supabase.bucket = value.trim() || 'shared-notes';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Table name')
			.setDesc('Database table for metadata (optional)')
			.addText(text => text
				.setPlaceholder('shared_notes')
				.setValue(this.plugin.settings.providers.supabase.tableName)
				.onChange(async (value) => {
					this.plugin.settings.providers.supabase.tableName = value.trim() || 'shared_notes';
					await this.plugin.saveSettings();
				}));

		this.addTestConnectionButton(containerEl);
	}

	private renderConvexSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'Convex Settings' });

		const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
		infoEl.style.marginBottom = '12px';
		infoEl.innerHTML = `
			<p style="margin: 0 0 8px 0;">Host shared notes on Convex serverless backend.</p>
		`;

		new Setting(containerEl)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.providers.convex.enabled)
				.onChange(async (value) => {
					this.plugin.settings.providers.convex.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Deployment URL')
			.addText(text => text
				.setPlaceholder('https://xxx.convex.cloud')
				.setValue(this.plugin.settings.providers.convex.deploymentUrl)
				.onChange(async (value) => {
					this.plugin.settings.providers.convex.deploymentUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Public URL')
			.setDesc('Public URL for accessing shared notes')
			.addText(text => text
				.setPlaceholder('https://notes.example.com')
				.setValue(this.plugin.settings.providers.convex.publicUrl)
				.onChange(async (value) => {
					this.plugin.settings.providers.convex.publicUrl = value.trim();
					await this.plugin.saveSettings();
				}));

		this.addTestConnectionButton(containerEl);
	}

	private addTestConnectionButton(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Test connection')
			.setDesc('Verify provider configuration')
			.addButton(button => button
				.setButtonText('Test')
				.onClick(async () => {
					const connected = await this.plugin.api.testConnection();
					if (connected) {
						new Notice('✓ Connection successful');
					} else {
						new Notice('✗ Connection failed. Check your settings.');
					}
				}));
	}
}
