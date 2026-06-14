import { describe, expect, it } from 'vitest';
import {
  decryptChunk,
  encryptChunk,
  exportKeyToString,
  generateEncryptionKey,
  importKeyFromString,
} from './crypto.js';

describe('AES-GCM crypto', () => {
  it('round-trips a chunk through encrypt/decrypt', async () => {
    const key = await generateEncryptionKey();
    const plaintext = new TextEncoder().encode('top secret bytes');
    const { ciphertext, iv } = await encryptChunk(key, plaintext);

    expect(new Uint8Array(ciphertext)).not.toEqual(plaintext);

    const decrypted = await decryptChunk(key, ciphertext, iv);
    expect(new Uint8Array(decrypted)).toEqual(plaintext);
  });

  it('exports and re-imports a key (URL-hash transport)', async () => {
    const key = await generateEncryptionKey();
    const exported = await exportKeyToString(key);
    expect(exported).toMatch(/^[A-Za-z0-9_-]+$/);

    const reimported = await importKeyFromString(exported);
    const plaintext = new TextEncoder().encode('hello');
    const { ciphertext, iv } = await encryptChunk(key, plaintext);
    const decrypted = await decryptChunk(reimported, ciphertext, iv);
    expect(new Uint8Array(decrypted)).toEqual(plaintext);
  });

  it('fails to decrypt with the wrong key', async () => {
    const keyA = await generateEncryptionKey();
    const keyB = await generateEncryptionKey();
    const { ciphertext, iv } = await encryptChunk(keyA, new Uint8Array([1, 2, 3]));
    await expect(decryptChunk(keyB, ciphertext, iv)).rejects.toThrow();
  });

  it('uses a unique IV per chunk', async () => {
    const key = await generateEncryptionKey();
    const a = await encryptChunk(key, new Uint8Array([1]));
    const b = await encryptChunk(key, new Uint8Array([1]));
    expect(a.iv).not.toBe(b.iv);
  });
});
