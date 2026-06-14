import { base64UrlToBytes, bytesToBase64Url } from './base64.js';

/**
 * Zero-knowledge AES-GCM helpers (Web Crypto). The 256-bit key is generated in
 * the sender's browser, exported to base64url, and passed to the receiver via
 * the URL fragment (`#k=...`) — which browsers never transmit to the server.
 * Each chunk gets a fresh random 96-bit IV.
 */
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function getSubtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API is unavailable (requires a secure context / Node ≥ 20).');
  }
  return c.subtle;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return getSubtle().generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function exportKeyToString(key: CryptoKey): Promise<string> {
  const raw = await getSubtle().exportKey('raw', key);
  return bytesToBase64Url(new Uint8Array(raw));
}

export async function importKeyFromString(value: string): Promise<CryptoKey> {
  const raw = base64UrlToBytes(value);
  return getSubtle().importKey('raw', raw, { name: ALGORITHM }, true, ['encrypt', 'decrypt']);
}

export interface EncryptedChunk {
  ciphertext: ArrayBuffer;
  /** base64url-encoded 12-byte IV. */
  iv: string;
}

export async function encryptChunk(key: CryptoKey, plaintext: BufferSource): Promise<EncryptedChunk> {
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = await getSubtle().encrypt({ name: ALGORITHM, iv }, key, plaintext);
  return { ciphertext, iv: bytesToBase64Url(iv) };
}

export async function decryptChunk(
  key: CryptoKey,
  ciphertext: BufferSource,
  iv: string,
): Promise<ArrayBuffer> {
  return getSubtle().decrypt({ name: ALGORITHM, iv: base64UrlToBytes(iv) }, key, ciphertext);
}
