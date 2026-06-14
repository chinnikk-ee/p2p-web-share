import { describe, expect, it } from 'vitest';
import { Sha256Stream } from './sha256.js';
import { bytesToHex } from './hash.js';

async function nativeSha256Hex(data: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

describe('Sha256Stream', () => {
  it('matches the known digest of the empty string', () => {
    expect(new Sha256Stream().digestHex()).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the known digest of "abc"', () => {
    const data = new TextEncoder().encode('abc');
    expect(new Sha256Stream().update(data).digestHex()).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('matches the 56-byte boundary vector', () => {
    const data = new TextEncoder().encode(
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    );
    expect(new Sha256Stream().update(data).digestHex()).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('produces the same result when fed in arbitrary chunk sizes', async () => {
    // getRandomValues caps at 65,536 bytes per call, so fill in windows.
    const data = new Uint8Array(200_000);
    for (let offset = 0; offset < data.length; offset += 65_536) {
      crypto.getRandomValues(data.subarray(offset, offset + 65_536));
    }
    const expected = await nativeSha256Hex(data);

    for (const size of [1, 63, 64, 65, 1000, 65_536]) {
      const hasher = new Sha256Stream();
      for (let offset = 0; offset < data.length; offset += size) {
        hasher.update(data.subarray(offset, offset + size));
      }
      expect(hasher.digestHex()).toBe(expected);
    }
  });

  it('throws if updated after finalization', () => {
    const hasher = new Sha256Stream();
    hasher.digest();
    expect(() => hasher.update(new Uint8Array([1]))).toThrow();
  });
});
