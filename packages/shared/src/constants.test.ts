import { describe, expect, it } from 'vitest';
import {
  CHUNK,
  GCM_TAG_BYTES,
  MAX_DATACHANNEL_MESSAGE,
  initialChunkSize,
  SIZE,
} from './constants.js';

const { MB } = SIZE;

describe('chunk sizing vs. data-channel limit', () => {
  // Regression: a 256 KiB plaintext chunk + the 16-byte AES-GCM tag overflowed
  // Chrome's 256 KiB SCTP max-message-size, aborting every large encrypted
  // transfer at chunk 0. The encrypted payload must always fit the limit.
  it('keeps the encrypted payload within the data-channel message limit', () => {
    const sizes = [1 * MB, 64 * MB, 200 * MB, 2048 * MB];
    for (const fileSize of sizes) {
      const chunk = initialChunkSize(fileSize);
      expect(chunk + GCM_TAG_BYTES).toBeLessThanOrEqual(MAX_DATACHANNEL_MESSAGE);
    }
  });

  it('caps the largest plaintext chunk at the limit minus the GCM tag', () => {
    expect(CHUNK.MAX + GCM_TAG_BYTES).toBe(MAX_DATACHANNEL_MESSAGE);
  });

  it('orders the chunk band MIN <= DEFAULT <= MAX', () => {
    expect(CHUNK.MIN).toBeLessThanOrEqual(CHUNK.DEFAULT);
    expect(CHUNK.DEFAULT).toBeLessThanOrEqual(CHUNK.MAX);
  });
});
