import { describe, expect, it } from 'vitest';
import { transferMessageSchema } from './transfer.js';
import { signalDataSchema } from './signaling.js';

describe('transferMessageSchema', () => {
  it('accepts a valid manifest', () => {
    const result = transferMessageSchema.safeParse({
      kind: 'manifest',
      transferId: '00000000-0000-4000-8000-000000000000',
      name: 'photo.png',
      size: 1024,
      mime: 'image/png',
      totalChunks: 4,
      chunkSize: 256,
      encrypted: true,
      hashAlgorithm: 'SHA-256',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a chunk header with a non-hex hash', () => {
    const result = transferMessageSchema.safeParse({
      kind: 'chunk',
      index: 0,
      byteLength: 256,
      hash: 'not-a-hash',
    });
    expect(result.success).toBe(false);
  });

  it('applies the default resumeFrom on ready', () => {
    const result = transferMessageSchema.safeParse({ kind: 'ready' });
    expect(result.success).toBe(true);
    if (result.success && result.data.kind === 'ready') {
      expect(result.data.resumeFrom).toEqual([]);
    }
  });
});

describe('signalDataSchema', () => {
  it('discriminates offer/answer/candidate', () => {
    expect(signalDataSchema.safeParse({ type: 'offer', sdp: 'v=0...' }).success).toBe(true);
    expect(
      signalDataSchema.safeParse({ type: 'candidate', candidate: { candidate: 'candidate:...' } })
        .success,
    ).toBe(true);
    expect(signalDataSchema.safeParse({ type: 'bogus' }).success).toBe(false);
  });
});
