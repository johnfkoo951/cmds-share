/**
 * AES-256-GCM encryption for note content
 * Based on share-note implementation with improvements
 */

export interface EncryptedData {
	ciphertext: string[];
	key: string;
}

const CHUNK_SIZE = 2000;
const PBKDF2_ITERATIONS = 100000;

/**
 * Generate a cryptographic hash
 */
export async function sha256(data: string): Promise<string> {
	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
	return arrayBufferToHex(hashBuffer);
}

/**
 * Generate a short hash (for filenames, IDs)
 */
export async function shortHash(data: string): Promise<string> {
	const hash = await sha256(data);
	return hash.slice(0, 8);
}

/**
 * SHA-1 hash for file deduplication
 */
export async function sha1(data: string | ArrayBuffer): Promise<string> {
	let buffer: ArrayBuffer;
	if (typeof data === 'string') {
		buffer = new TextEncoder().encode(data);
	} else {
		buffer = data;
	}
	const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
	return arrayBufferToHex(hashBuffer);
}

/**
 * Encrypt a string with AES-256-GCM
 */
export async function encryptString(plaintext: string, existingKey?: string): Promise<EncryptedData> {
	let masterKey: ArrayBuffer;
	
	if (existingKey) {
		masterKey = base64ToArrayBuffer(existingKey);
	} else {
		// Generate a new random master key
		const randomBytes = crypto.getRandomValues(new Uint8Array(64));
		masterKey = await deriveKey(randomBytes.buffer);
	}
	
	const aesKey = await getAesGcmKey(masterKey);
	const ciphertext: string[] = [];
	const length = plaintext.length;
	let index = 0;
	
	while (index * CHUNK_SIZE < length) {
		const chunk = plaintext.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
		const encodedChunk = new TextEncoder().encode(chunk);
		
		const encryptedChunk = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: indexToIv(index),
			},
			aesKey,
			encodedChunk
		);
		
		ciphertext.push(arrayBufferToBase64(encryptedChunk));
		index++;
	}
	
	return {
		ciphertext,
		key: masterKeyToString(masterKey).slice(0, 43),
	};
}

/**
 * Decrypt encrypted data
 */
export async function decryptString(encryptedData: EncryptedData): Promise<string> {
	const masterKey = base64ToArrayBuffer(encryptedData.key);
	const aesKey = await getAesGcmKey(masterKey);
	const decryptedChunks: string[] = [];
	
	for (let index = 0; index < encryptedData.ciphertext.length; index++) {
		const chunk = base64ToArrayBuffer(encryptedData.ciphertext[index]);
		
		const decryptedChunk = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: indexToIv(index),
			},
			aesKey,
			chunk
		);
		
		decryptedChunks.push(new TextDecoder().decode(decryptedChunk));
	}
	
	return decryptedChunks.join('');
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

async function deriveKey(input: ArrayBuffer): Promise<ArrayBuffer> {
	const salt = new TextEncoder().encode('cmds-share-salt');
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		input,
		'PBKDF2',
		false,
		['deriveBits']
	);
	
	return await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256',
		},
		keyMaterial,
		256
	);
}

async function getAesGcmKey(masterKey: ArrayBuffer): Promise<CryptoKey> {
	return await crypto.subtle.importKey(
		'raw',
		masterKey,
		{ name: 'AES-GCM' },
		false,
		['encrypt', 'decrypt']
	);
}

function indexToIv(index: number): Uint8Array {
	const iv = new Uint8Array(12);
	const view = new DataView(iv.buffer);
	view.setUint32(0, index, true);
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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Array.from(bytes)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

function masterKeyToString(key: ArrayBuffer): string {
	return arrayBufferToBase64(key).replace(/\+/g, '-').replace(/\//g, '_');
}
