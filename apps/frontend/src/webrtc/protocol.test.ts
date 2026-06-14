import { describe, expect, it } from 'vitest';
import type { FileManifest } from '@p2p/types';
import { decodeMessage, encodeMessage } from './protocol';

describe('protocol codec', () => {
  const manifest: FileManifest = {
    kind: 'manifest',
    transferId: '00000000-0000-4000-8000-000000000000',
    name: 'report.pdf',
    size: 2048,
    mime: 'application/pdf',
    totalChunks: 8,
    chunkSize: 256,
    encrypted: true,
    hashAlgorithm: 'SHA-256',
  };

  it('round-trips a control message', () => {
    const decoded = decodeMessage(encodeMessage(manifest));
    expect(decoded).toEqual(manifest);
  });

  it('returns null for non-JSON', () => {
    expect(decodeMessage('not json at all')).toBeNull();
  });

  it('returns null for JSON that is not a protocol message', () => {
    expect(decodeMessage(JSON.stringify({ kind: 'totally-unknown' }))).toBeNull();
    expect(decodeMessage(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });

  it('encodes ack/have/request frames', () => {
    expect(decodeMessage(encodeMessage({ kind: 'ack', index: 3 }))).toEqual({
      kind: 'ack',
      index: 3,
    });
    expect(decodeMessage(encodeMessage({ kind: 'request', indices: [1, 2] }))).toEqual({
      kind: 'request',
      indices: [1, 2],
    });
  });
});
