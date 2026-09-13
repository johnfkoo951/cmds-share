import { requestUrl } from 'obsidian';
import {
	AnyProviderConfig,
	CloudProviderConfig,
	SynologyProviderConfig,
	GitHubProviderConfig,
	SupabaseProviderConfig,
	ConvexProviderConfig,
	UploadResult,
	DeleteResult,
} from './types';

/** Governance metadata sent alongside a note upload (providers may ignore it). */
export interface ShareMeta {
	shortId: string;
	title: string;
	encrypted: boolean;
	expiresAt?: number;
	vaultId: string;
}

/** Server-side share record, returned by providers that support listing. */
export interface RemoteNoteMeta {
	shortId: string;
	title: string;
	encrypted: boolean;
	viewCount: number;
	expiresAt?: number;
	revoked: boolean;
	sizeBytes: number;
	createdAt: number;
	updatedAt: number;
}

export interface ServerProvider {
	upload(content: string, filename: string, mimeType: string, meta?: ShareMeta): Promise<UploadResult>;
	uploadBinary(data: ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult>;
	delete(filename: string): Promise<DeleteResult>;
	testConnection(): Promise<boolean>;
	getPublicUrl(filename: string): string;
	/** Governance servers only: list all shares for a vault (CMS reconcile). */
	list?(vaultId: string): Promise<RemoteNoteMeta[]>;
	/** Governance servers only: soft-revoke / restore a share without deleting it. */
	revoke?(shortId: string, revoked: boolean): Promise<DeleteResult>;
}

/**
 * CMDSPACE governance server (share.cmdspace.work).
 * Bearer-token auth; server keeps a share registry with view counts,
 * expiry enforcement, and revocation.
 */
export class CmdspaceProvider implements ServerProvider {
	constructor(private config: CloudProviderConfig) {}

	private get headers(): Record<string, string> {
		return { 'x-cmds-token': this.config.apiKey };
	}

	private configured(): boolean {
		return Boolean(this.config.apiUrl && this.config.apiKey);
	}

	async upload(content: string, filename: string, mimeType: string, meta?: ShareMeta): Promise<UploadResult> {
		const body = new TextEncoder().encode(content).buffer;
		return this.uploadBytes(body, filename, mimeType, meta);
	}

	async uploadBinary(data: ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult> {
		return this.uploadBytes(data, filename, mimeType);
	}

	private async uploadBytes(data: ArrayBuffer, filename: string, mimeType: string, meta?: ShareMeta): Promise<UploadResult> {
		if (!this.configured()) {
			return { success: false, error: 'CMDSPACE provider not configured' };
		}

		try {
			const headers: Record<string, string> = {
				...this.headers,
				'Content-Type': mimeType,
				'x-cmds-filename': filename,
			};
			if (meta) {
				// header values must be ASCII — Korean titles travel base64-encoded
				headers['x-cmds-title'] = utf8ToBase64(meta.title);
				headers['x-cmds-encrypted'] = meta.encrypted ? '1' : '0';
				headers['x-cmds-vault-id'] = meta.vaultId;
				if (meta.expiresAt) headers['x-cmds-expires-at'] = String(meta.expiresAt);
			}

			const response = await requestUrl({
				url: `${this.config.apiUrl}/v1/file/upload`,
				method: 'POST',
				headers,
				body: data,
				throw: false,
			});

			if (response.status < 200 || response.status >= 300) {
				const detail = response.status === 409 ? 'short ID already in use by another vault' : `${response.status}`;
				return { success: false, error: `Upload failed (${detail})` };
			}

			return {
				success: true,
				url: response.json?.url || this.getPublicUrl(filename),
				key: filename,
			};
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
		}
	}

	async delete(filename: string): Promise<DeleteResult> {
		if (!this.configured()) {
			return { success: false, error: 'CMDSPACE provider not configured' };
		}
		try {
			const response = await requestUrl({
				url: `${this.config.apiUrl}/v1/file/delete`,
				method: 'POST',
				headers: { ...this.headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename }),
				throw: false,
			});
			return { success: response.status >= 200 && response.status < 300 };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
		}
	}

	async list(vaultId: string): Promise<RemoteNoteMeta[]> {
		if (!this.configured()) return [];
		const response = await requestUrl({
			url: `${this.config.apiUrl}/v1/notes?vaultId=${encodeURIComponent(vaultId)}`,
			method: 'GET',
			headers: this.headers,
			throw: false,
		});
		if (response.status !== 200) {
			throw new Error(`List failed (${response.status})`);
		}
		const payload = response.json as { notes?: RemoteNoteMeta[] } | undefined;
		return payload?.notes || [];
	}

	async revoke(shortId: string, revoked: boolean): Promise<DeleteResult> {
		if (!this.configured()) {
			return { success: false, error: 'CMDSPACE provider not configured' };
		}
		try {
			const response = await requestUrl({
				url: `${this.config.apiUrl}/v1/notes/revoke`,
				method: 'POST',
				headers: { ...this.headers, 'Content-Type': 'application/json' },
				body: JSON.stringify({ shortId, revoked }),
				throw: false,
			});
			return { success: response.status >= 200 && response.status < 300 };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.configured()) return false;
		try {
			// /health proves the server is up; /v1/notes proves the token works
			const health = await requestUrl({ url: `${this.config.apiUrl}/health`, method: 'GET', throw: false });
			if (health.status !== 200) return false;
			const authed = await requestUrl({
				url: `${this.config.apiUrl}/v1/notes`,
				method: 'GET',
				headers: this.headers,
				throw: false,
			});
			return authed.status === 200;
		} catch {
			return false;
		}
	}

	getPublicUrl(filename: string): string {
		const base = this.config.publicUrl.replace(/\/$/, '');
		if (filename.endsWith('.html') && !filename.includes('/')) {
			return `${base}/${filename.replace(/\.html$/, '')}`;
		}
		return `${base}/f/${filename}`;
	}
}

function utf8ToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

export class SynologyProvider implements ServerProvider {
	constructor(private config: SynologyProviderConfig) {}

	async upload(content: string, filename: string, mimeType: string): Promise<UploadResult> {
		return this.putToNas(content, filename, mimeType);
	}

	async uploadBinary(data: ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult> {
		return this.putToNas(data, filename, mimeType);
	}

	private async putToNas(body: string | ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult> {
		if (!this.config.nasUrl || !this.config.username) {
			return { success: false, error: 'Synology NAS not configured' };
		}

		try {
			const auth = btoa(`${this.config.username}:${this.config.password}`);
			const uploadPath = `${this.config.sharedFolder}/${filename}`;

			const response = await requestUrl({
				url: `${this.config.nasUrl}${uploadPath}`,
				method: 'PUT',
				headers: {
					'Authorization': `Basic ${auth}`,
					'Content-Type': mimeType,
				},
				body,
				throw: false,
			});

			const ok = response.status >= 200 && response.status < 300;
			if (!ok) {
				return { success: false, error: `Upload failed (${response.status})` };
			}

			return {
				success: true,
				url: this.getPublicUrl(filename),
				key: filename,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async delete(filename: string): Promise<DeleteResult> {
		try {
			const auth = btoa(`${this.config.username}:${this.config.password}`);
			const deletePath = `${this.config.sharedFolder}/${filename}`;

			const response = await requestUrl({
				url: `${this.config.nasUrl}${deletePath}`,
				method: 'DELETE',
				headers: {
					'Authorization': `Basic ${auth}`,
				},
				throw: false,
			});

			const ok = (response.status >= 200 && response.status < 300) || response.status === 404;
			return { success: ok };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.config.nasUrl || !this.config.username) {
			return false;
		}
		try {
			const auth = btoa(`${this.config.username}:${this.config.password}`);
			const response = await requestUrl({
				url: this.config.nasUrl,
				method: 'PROPFIND',
				headers: {
					'Authorization': `Basic ${auth}`,
					'Depth': '0',
				},
				throw: false,
			});
			return response.status === 207 || response.status === 200;
		} catch {
			return false;
		}
	}

	getPublicUrl(filename: string): string {
		return `${this.config.publicUrl}/${filename}`;
	}
}

export interface GitHubSetupResult {
	success: boolean;
	message: string;
	repo?: string;
	branch?: string;
	pagesUrl?: string;
	created?: boolean;
}

const GH_DEFAULT_REPO = 'obsidian-shared-notes';
const GH_NOT_CONFIGURED = 'GitHub Pages is not set up yet — open Settings → CMDS Share, paste a token and click "Set up repository"';

export class GitHubProvider implements ServerProvider {
	constructor(private config: GitHubProviderConfig) {}

	private ghHeaders(json = false): Record<string, string> {
		const h: Record<string, string> = {
			'Authorization': `Bearer ${this.config.token}`,
			'Accept': 'application/vnd.github+json',
		};
		if (json) h['Content-Type'] = 'application/json';
		return h;
	}

	/**
	 * One-click onboarding: resolve the token's login, create the repo if it
	 * doesn't exist (public, auto-initialised on `branch`), drop a .nojekyll,
	 * enable Pages from that branch, and record the Pages URL GitHub reports.
	 * Idempotent — safe to re-run on an already-configured repo.
	 */
	async setup(): Promise<GitHubSetupResult> {
		if (!this.config.token) return { success: false, message: 'Paste a GitHub token first' };
		const branch = this.config.branch || 'main';
		try {
			const me = await requestUrl({ url: 'https://api.github.com/user', headers: this.ghHeaders(), throw: false });
			if (me.status !== 200) return { success: false, message: `Token rejected (${me.status}). Create a classic token with the "repo" scope.` };
			const login = (me.json as { login: string }).login;

			let full = (this.config.repo || '').trim();
			if (!full) full = `${login}/${GH_DEFAULT_REPO}`;
			else if (!full.includes('/')) full = `${login}/${full}`;
			const [owner, repo] = full.split('/');
			const base = `https://api.github.com/repos/${owner}/${repo}`;

			let created = false;
			const probe = await requestUrl({ url: base, headers: this.ghHeaders(), throw: false });
			if (probe.status === 404) {
				const target = owner === login ? 'https://api.github.com/user/repos' : `https://api.github.com/orgs/${owner}/repos`;
				const mk = await requestUrl({
					url: target,
					method: 'POST',
					headers: this.ghHeaders(true),
					body: JSON.stringify({
						name: repo,
						description: 'Notes shared from Obsidian with CMDS Share',
						private: false,
						auto_init: true,
						has_issues: false,
						has_wiki: false,
						has_projects: false,
					}),
					throw: false,
				});
				if (mk.status !== 201) {
					const msg = (mk.json as { message?: string })?.message || `HTTP ${mk.status}`;
					return { success: false, message: `Could not create ${full}: ${msg}` };
				}
				created = true;
				// GitHub needs a beat before the new branch accepts content writes
				await new Promise(r => setTimeout(r, 1500));
			} else if (probe.status !== 200) {
				return { success: false, message: `Cannot access ${full} (${probe.status})` };
			} else if ((probe.json as { private?: boolean }).private) {
				return { success: false, message: `${full} is private — GitHub Pages on a free plan needs a public repo` };
			}

			// keep Pages from running Jekyll over the notes (faster, no underscore surprises)
			const nojekyll = `${base}/contents/.nojekyll`;
			const existing = await this.getFileSha(nojekyll, branch);
			if (!existing) {
				const put = await requestUrl({
					url: nojekyll,
					method: 'PUT',
					headers: this.ghHeaders(true),
					body: JSON.stringify({ message: 'Disable Jekyll for shared notes', content: '', branch }),
					throw: false,
				});
				if (put.status === 404 || put.status === 422) {
					return { success: false, message: `Branch "${branch}" not found in ${full}. Set Branch to the repo's default branch (usually main).` };
				}
			}

			// enable Pages from <branch>:/ — 409 = already enabled, fine
			const pagesApi = `${base}/pages`;
			let pages = await requestUrl({ url: pagesApi, headers: this.ghHeaders(), throw: false });
			if (pages.status === 404) {
				const en = await requestUrl({
					url: pagesApi,
					method: 'POST',
					headers: this.ghHeaders(true),
					body: JSON.stringify({ source: { branch, path: '/' } }),
					throw: false,
				});
				if (en.status !== 201 && en.status !== 409) {
					const msg = (en.json as { message?: string })?.message || `HTTP ${en.status}`;
					return { success: false, message: `Repo ready, but enabling Pages failed: ${msg}. Token needs the "repo" scope (classic) or Pages: write (fine-grained).` };
				}
				pages = await requestUrl({ url: pagesApi, headers: this.ghHeaders(), throw: false });
			}
			const pagesUrl = pages.status === 200
				? ((pages.json as { html_url?: string }).html_url || '').replace(/\/+$/, '')
				: '';

			return {
				success: true,
				created,
				repo: full,
				branch,
				pagesUrl,
				message: created ? `Created ${full} and enabled GitHub Pages` : `${full} is ready (Pages enabled)`,
			};
		} catch (error) {
			return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
		}
	}

	async upload(content: string, filename: string, mimeType: string): Promise<UploadResult> {
		if (!this.config.token || !this.config.repo) {
			return { success: false, error: GH_NOT_CONFIGURED };
		}

		try {
			const [owner, repo] = this.config.repo.split('/');
			const filePath = `${this.config.path}/${filename}`;
			const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

			const existingFile = await this.getFileSha(apiUrl);
			const body: Record<string, string> = {
				message: `Update ${filename}`,
				// byte-wise base64 — btoa(content) throws on non-Latin1 (Korean) text
				content: this.arrayBufferToBase64(new TextEncoder().encode(content).buffer as ArrayBuffer),
				branch: this.config.branch,
			};

			if (existingFile) {
				body.sha = existingFile;
			}

			const response = await requestUrl({
				url: apiUrl,
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${this.config.token}`,
					'Accept': 'application/vnd.github.v3+json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (response.status !== 200 && response.status !== 201) {
				return { success: false, error: `GitHub API error (${response.status})` };
			}

			return {
				success: true,
				url: this.getPublicUrl(filename),
				key: filename,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async uploadBinary(data: ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult> {
		const base64Content = this.arrayBufferToBase64(data);
		return this.uploadBase64(base64Content, filename);
	}

	private async uploadBase64(base64Content: string, filename: string): Promise<UploadResult> {
		if (!this.config.token || !this.config.repo) {
			return { success: false, error: GH_NOT_CONFIGURED };
		}

		try {
			const [owner, repo] = this.config.repo.split('/');
			const filePath = `${this.config.path}/${filename}`;
			const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

			const existingFile = await this.getFileSha(apiUrl);
			const body: Record<string, string> = {
				message: `Update ${filename}`,
				content: base64Content,
				branch: this.config.branch,
			};

			if (existingFile) {
				body.sha = existingFile;
			}

			const response = await requestUrl({
				url: apiUrl,
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${this.config.token}`,
					'Accept': 'application/vnd.github.v3+json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (response.status !== 200 && response.status !== 201) {
				return { success: false, error: `GitHub API error (${response.status})` };
			}

			return {
				success: true,
				url: this.getPublicUrl(filename),
				key: filename,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async delete(filename: string): Promise<DeleteResult> {
		try {
			const [owner, repo] = this.config.repo.split('/');
			const filePath = `${this.config.path}/${filename}`;
			const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

			const sha = await this.getFileSha(apiUrl);
			if (!sha) {
				return { success: true };
			}

			const response = await requestUrl({
				url: apiUrl,
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${this.config.token}`,
					'Accept': 'application/vnd.github.v3+json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: `Delete ${filename}`,
					sha,
					branch: this.config.branch,
				}),
			});

			return { success: response.status === 200 };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.config.token || !this.config.repo) {
			return false;
		}
		try {
			const [owner, repo] = this.config.repo.split('/');
			const response = await requestUrl({
				url: `https://api.github.com/repos/${owner}/${repo}`,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.config.token}`,
					'Accept': 'application/vnd.github.v3+json',
				},
			});
			return response.status === 200;
		} catch {
			return false;
		}
	}

	getPublicUrl(filename: string): string {
		return `${this.getSiteRoot()}/${this.config.path}/${filename}`;
	}

	/** Pages site root without trailing slash. */
	getSiteRoot(): string {
		if (this.config.customDomain) return `https://${this.config.customDomain}`;
		if (this.config.pagesUrl) return this.config.pagesUrl.replace(/\/+$/, '');
		const [owner, repo] = (this.config.repo || '/').split('/');
		// a user/org site repo (<owner>.github.io) is served from the domain root
		if (repo && repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) return `https://${repo}`;
		return `https://${owner}.github.io/${repo}`;
	}

	private async getFileSha(apiUrl: string, branch = this.config.branch): Promise<string | null> {
		try {
			const response = await requestUrl({
				url: `${apiUrl}?ref=${branch}`,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.config.token}`,
					'Accept': 'application/vnd.github.v3+json',
				},
			});
			if (response.status === 200) {
				return (response.json as { sha?: string }).sha ?? null;
			}
		} catch {
			// File doesn't exist
		}
		return null;
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}
}

export class SupabaseProvider implements ServerProvider {
	constructor(private config: SupabaseProviderConfig) {}

	async upload(content: string, filename: string, mimeType: string): Promise<UploadResult> {
		return this.uploadToBucket(content, filename, mimeType);
	}

	async uploadBinary(data: ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult> {
		return this.uploadToBucket(data, filename, mimeType);
	}

	private async uploadToBucket(body: string | ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult> {
		if (!this.config.projectUrl || !this.config.anonKey) {
			return { success: false, error: 'Supabase not configured' };
		}

		try {
			const response = await requestUrl({
				url: `${this.config.projectUrl}/storage/v1/object/${this.config.bucket}/${filename}`,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.config.anonKey}`,
					'apikey': this.config.anonKey,
					'Content-Type': mimeType,
					'x-upsert': 'true',
				},
				body,
				throw: false,
			});

			if (response.status < 200 || response.status >= 300) {
				return { success: false, error: `Supabase error: ${response.text || response.status}` };
			}

			return {
				success: true,
				url: this.getPublicUrl(filename),
				key: filename,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async delete(filename: string): Promise<DeleteResult> {
		try {
			const response = await requestUrl({
				url: `${this.config.projectUrl}/storage/v1/object/${this.config.bucket}/${filename}`,
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${this.config.anonKey}`,
					'apikey': this.config.anonKey,
				},
				throw: false,
			});

			const ok = (response.status >= 200 && response.status < 300) || response.status === 404;
			return { success: ok };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.config.projectUrl || !this.config.anonKey) {
			return false;
		}
		try {
			const response = await requestUrl({
				url: `${this.config.projectUrl}/storage/v1/bucket/${this.config.bucket}`,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.config.anonKey}`,
					'apikey': this.config.anonKey,
				},
				throw: false,
			});
			return response.status >= 200 && response.status < 300;
		} catch {
			return false;
		}
	}

	getPublicUrl(filename: string): string {
		return `${this.config.projectUrl}/storage/v1/object/public/${this.config.bucket}/${filename}`;
	}
}

export class ConvexProvider implements ServerProvider {
	constructor(private config: ConvexProviderConfig) {}

	async upload(content: string, filename: string, mimeType: string, meta?: ShareMeta): Promise<UploadResult> {
		if (!this.config.deploymentUrl) {
			return { success: false, error: 'Convex not configured' };
		}

		try {
			const args: Record<string, unknown> = { content, filename, mimeType };
			if (meta) {
				args.title = meta.title;
				args.encrypted = meta.encrypted;
				if (meta.expiresAt) args.expiresAt = meta.expiresAt;
			}
			const response = await requestUrl({
				url: `${this.config.deploymentUrl}/api/mutation`,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: 'notes:upload',
					args,
					format: 'json',
				}),
				throw: false,
			});

			if (response.status < 200 || response.status >= 300) {
				return { success: false, error: `Convex error (${response.status}): ${response.text}` };
			}

			const result = response.json as { status?: string; errorMessage?: string; value?: { id?: string } };
			if (result.status === 'error') {
				return { success: false, error: result.errorMessage || 'Convex mutation failed' };
			}

			return {
				success: true,
				url: this.getPublicUrl(filename),
				key: result.value?.id || filename,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async uploadBinary(data: ArrayBuffer, filename: string, mimeType: string): Promise<UploadResult> {
		const base64 = this.arrayBufferToBase64(data);
		return this.upload(base64, filename, mimeType);
	}

	async delete(filename: string): Promise<DeleteResult> {
		try {
			const response = await requestUrl({
				url: `${this.config.deploymentUrl}/api/mutation`,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: 'notes:deleteNote',
					args: { filename },
					format: 'json',
				}),
				throw: false,
			});

			if (response.status < 200 || response.status >= 300) {
				return { success: false, error: `Convex error (${response.status})` };
			}

			const result = response.json as { status?: string; errorMessage?: string };
			if (result.status === 'error') {
				return { success: false, error: result.errorMessage };
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async testConnection(): Promise<boolean> {
		if (!this.config.deploymentUrl) {
			return false;
		}
		try {
			const response = await requestUrl({
				url: `${this.config.deploymentUrl}/api/query`,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: 'notes:health',
					args: {},
					format: 'json',
				}),
				throw: false,
			});

			if (response.status < 200 || response.status >= 300) return false;

			const result = response.json as { status?: string; value?: { status?: string } };
			return result.status === 'success' || result.value?.status === 'ok';
		} catch {
			return false;
		}
	}

	getPublicUrl(filename: string): string {
		const siteUrl = this.config.publicUrl
			.replace('.convex.cloud', '.convex.site')
			.replace(/\/$/, '');
		return `${siteUrl}/note/${filename}`;
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}
}

export function createServerProvider(config: AnyProviderConfig): ServerProvider | null {
	switch (config.type) {
		case 'cloud':
			return new CmdspaceProvider(config);
		case 'synology':
			return new SynologyProvider(config);
		case 'github':
			return new GitHubProvider(config);
		case 'supabase':
			return new SupabaseProvider(config);
		case 'convex':
			return new ConvexProvider(config);
		default:
			return null;
	}
}
