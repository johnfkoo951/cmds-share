/**
 * AES-256-GCM encryption for note content.
 * Each share generates a fresh random 256-bit key, so the per-chunk
 * counter IV never repeats under the same key.
 */

export interface EncryptedData {
	ciphertext: string[];
	key: string;
}

// Chunk by BYTES (not chars): plaintext is UTF-8 encoded first, then sliced,
// so multi-byte Korean text can't blow past the intended chunk size.
// Decryption must concatenate decrypted bytes before decoding (see template.ts).
const CHUNK_BYTES = 65536;

export async function sha256(data: string): Promise<string> {
	const dataBuffer = new TextEncoder().encode(data);
	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
	return arrayBufferToHex(hashBuffer);
}

/**
 * SHA-1 hash for content-addressed asset filenames
 */
export async function sha1(data: string | ArrayBuffer): Promise<string> {
	const buffer = typeof data === 'string' ? new TextEncoder().encode(data).buffer : data;
	const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
	return arrayBufferToHex(hashBuffer);
}

export async function encryptString(plaintext: string): Promise<EncryptedData> {
	const masterKey = crypto.getRandomValues(new Uint8Array(32)).buffer;
	const aesKey = await crypto.subtle.importKey('raw', masterKey, { name: 'AES-GCM' }, false, ['encrypt']);

	const encoded = new TextEncoder().encode(plaintext);
	const ciphertext: string[] = [];

	for (let index = 0; index * CHUNK_BYTES < encoded.length; index++) {
		const chunk = encoded.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
		const encryptedChunk = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: indexToIv(index) },
			aesKey,
			chunk
		);
		ciphertext.push(arrayBufferToBase64(encryptedChunk));
	}

	return {
		ciphertext,
		key: base64Url(masterKey),
	};
}

/**
 * Generate a random short ID for notes
 */
export function generateShortId(length = 8): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	let id = '';
	for (let i = 0; i < bytes.length; i++) {
		id += Math.floor(bytes[i] * 0.140625).toString(36);
	}
	return id;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function indexToIv(index: number): Uint8Array {
	const iv = new Uint8Array(12);
	new DataView(iv.buffer).setUint32(0, index, true);
	return iv;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Array.from(bytes)
		.map((b: number) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** URL-fragment-safe base64 (no padding). The share page reverses this before atob. */
function base64Url(key: ArrayBuffer): string {
	return arrayBufferToBase64(key).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
