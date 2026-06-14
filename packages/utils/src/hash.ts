import { Sha256Stream } from './sha256.js';

/** Returns the global `crypto`, throwing a clear error where it is missing. */
function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API is unavailable (requires a secure context / Node ≥ 20).');
  }
  return c;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += (bytes[i] as number).toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Native one-shot SHA-256 (hex). Used for per-chunk integrity verification —
 * fast and hardware-accelerated.
 */
export async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await getCrypto().subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Incremental SHA-256 for whole-file verification. Feed each plaintext chunk in
 * order; never holds the full file. Wraps {@link Sha256Stream}.
 */
export class FileHasher {
  private readonly stream = new Sha256Stream();

  update(chunk: Uint8Array): this {
    this.stream.update(chunk);
    return this;
  }

  finalizeHex(): string {
    return this.stream.digestHex();
  }
}

export { Sha256Stream };
