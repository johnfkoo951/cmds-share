export type ServerProviderType = 'cloud' | 'synology' | 'github' | 'supabase' | 'convex';

export type ShareStatus = 'draft' | 'published' | 'archived' | 'expired';

export type EncryptionMode = 'auto' | 'always' | 'never';

export interface SharedNote {
	id: string;
	filePath: string;
	url: string;
	shortId: string;
	title: string;
	status: ShareStatus;
	encrypted: boolean;
	encryptionKey?: string;
	provider: ServerProviderType;
	vaultId: string;
	vaultName: string;
	createdAt: number;
	updatedAt: number;
	expiresAt?: number;
	viewCount?: number;
	cssHash?: string;
	assetsHash?: string[];
}

export interface ShareResult {
	success: boolean;
	url?: string;
	shortId?: string;
	error?: string;
}

export interface UploadResult {
	success: boolean;
	url?: string;
	key?: string;
	hash?: string;
	error?: string;
}

export interface DeleteResult {
	success: boolean;
	error?: string;
}

export interface BaseProviderConfig {
	type: ServerProviderType;
	enabled: boolean;
	name: string;
}

export interface CloudProviderConfig extends BaseProviderConfig {
	type: 'cloud';
	apiUrl: string;
	apiKey: string;
	publicUrl: string;
}

export interface SynologyProviderConfig extends BaseProviderConfig {
	type: 'synology';
	nasUrl: string;
	username: string;
	password: string;
	sharedFolder: string;
	publicUrl: string;
}

export interface GitHubProviderConfig extends BaseProviderConfig {
	type: 'github';
	token: string;
	repo: string;
	branch: string;
	path: string;
	customDomain?: string;
}

export interface SupabaseProviderConfig extends BaseProviderConfig {
	type: 'supabase';
	projectUrl: string;
	anonKey: string;
	bucket: string;
	tableName: string;
}

export interface ConvexProviderConfig extends BaseProviderConfig {
	type: 'convex';
	deploymentUrl: string;
	publicUrl: string;
}

export type AnyProviderConfig = 
	| CloudProviderConfig 
	| SynologyProviderConfig 
	| GitHubProviderConfig 
	| SupabaseProviderConfig 
	| ConvexProviderConfig;

export type ShareMode = 'quick' | 'connected';

export interface AuthSession {
	userId: string;
	email: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

export interface CMDSShareSettings {
	uid: string;
	vaultId: string;
	vaultName: string;
	shareMode: ShareMode;
	auth?: AuthSession;
	supabaseAuthUrl: string;
	supabaseAnonKey: string;
	webCmsUrl: string;
	activeProvider: ServerProviderType;
	encryptionMode: EncryptionMode;
	defaultExpiration: string;
	includeTheme: boolean;
	removeBacklinks: boolean;
	removeFrontmatter: boolean;
	noteWidth: string;
	shareField: string;
	linkField: string;
	encryptedField: string;
	expiresField: string;
	providers: {
		cloud: CloudProviderConfig;
		synology: SynologyProviderConfig;
		github: GitHubProviderConfig;
		supabase: SupabaseProviderConfig;
		convex: ConvexProviderConfig;
	};
	enableCMS: boolean;
	cmsAutoRefresh: boolean;
	debugMode: boolean;
}

export const DEFAULT_SETTINGS: CMDSShareSettings = {
	uid: '',
	vaultId: '',
	vaultName: '',
	shareMode: 'quick',
	supabaseAuthUrl: '',
	supabaseAnonKey: '',
	webCmsUrl: 'https://share.cmdspace.work',
	activeProvider: 'cloud',
	encryptionMode: 'auto',
	defaultExpiration: '',
	includeTheme: true,
	removeBacklinks: true,
	removeFrontmatter: true,
	noteWidth: '750px',
	shareField: 'cmds_share',
	linkField: 'cmds_share_link',
	encryptedField: 'cmds_share_encrypted',
	expiresField: 'cmds_share_expires',
	providers: {
		cloud: {
			type: 'cloud',
			enabled: false,
			name: 'Cloud Service',
			apiUrl: '',
			apiKey: '',
			publicUrl: '',
		},
		synology: {
			type: 'synology',
			enabled: false,
			name: 'Synology NAS',
			nasUrl: '',
			username: '',
			password: '',
			sharedFolder: '/web/shared-notes',
			publicUrl: '',
		},
		github: {
			type: 'github',
			enabled: false,
			name: 'GitHub Pages',
			token: '',
			repo: '',
			branch: 'gh-pages',
			path: 'notes',
			customDomain: '',
		},
		supabase: {
			type: 'supabase',
			enabled: false,
			name: 'Supabase',
			projectUrl: '',
			anonKey: '',
			bucket: 'shared-notes',
			tableName: 'shared_notes',
		},
		convex: {
			type: 'convex',
			enabled: false,
			name: 'Convex',
			deploymentUrl: '',
			publicUrl: '',
		},
	},
	enableCMS: true,
	cmsAutoRefresh: false,
	debugMode: false,
};

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface FileCheckRequest {
	files: Array<{
		hash: string;
		filetype: string;
		byteLength: number;
	}>;
}

export interface FileCheckResponse {
	files: Array<{
		hash: string;
		filetype: string;
		url?: string;
		needsUpload: boolean;
	}>;
}

export interface NoteUploadRequest {
	shortId?: string;
	content: string;
	title: string;
	encrypted: boolean;
	cssUrl?: string;
	expiresAt?: number;
	metadata?: Record<string, unknown>;
}

export interface NoteUploadResponse {
	shortId: string;
	url: string;
}

export interface NoteTemplateData {
	title: string;
	content: string;
	cssUrl?: string;
	noteWidth: string;
	encrypted: boolean;
	encryptedData?: string;
	description?: string;
	theme?: 'light' | 'dark' | 'auto';
}

export interface CMSNoteEntry {
	id: string;
	filePath: string;
	title: string;
	url: string;
	status: ShareStatus;
	encrypted: boolean;
	provider: ServerProviderType;
	createdAt: number;
	updatedAt: number;
	expiresAt?: number;
	viewCount?: number;
}

export interface CMSStats {
	totalNotes: number;
	publishedNotes: number;
	encryptedNotes: number;
	totalViews: number;
	byProvider: Record<ServerProviderType, number>;
}

export const SUPPORTED_PROVIDERS = ['cloud', 'synology', 'github', 'supabase', 'convex'] as const;

export const PROVIDER_DISPLAY_NAMES: Record<ServerProviderType, string> = {
	cloud: 'Cloud Service',
	synology: 'Synology NAS',
	github: 'GitHub Pages',
	supabase: 'Supabase',
	convex: 'Convex',
};

export const EXPIRATION_OPTIONS = [
	{ value: '', label: 'Never expires' },
	{ value: '1 hour', label: '1 hour' },
	{ value: '1 day', label: '1 day' },
	{ value: '7 days', label: '7 days' },
	{ value: '30 days', label: '30 days' },
	{ value: '90 days', label: '90 days' },
] as const;

export const CMS_VIEW_TYPE = 'cmds-share-cms';
