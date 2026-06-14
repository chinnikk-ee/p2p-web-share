export type StorageKind = 'memory' | 'opfs' | 'indexeddb';

/** Chunk payload — explicitly backed by an ArrayBuffer (not SharedArrayBuffer). */
export type ChunkBytes = Uint8Array<ArrayBuffer>;

export interface ChunkStoreParams {
  transferId: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
}

/**
 * Strategy interface for persisting received chunks. Implementations trade off
 * memory vs. capacity: in-memory for small files, OPFS/IndexedDB for large
 * files that must not be buffered in RAM.
 *
 * Per-chunk integrity is verified on the plaintext *before* `put`, so the store
 * never needs a random-access `get`; the whole file is read back once via
 * `assemble` for the final hash + download.
 */
export interface ChunkStore {
  readonly kind: StorageKind;
  init(): Promise<void>;
  put(index: number, data: ChunkBytes): Promise<void>;
  /** Indices already persisted — drives resume. */
  getStoredIndices(): Promise<number[]>;
  /** Reassemble the full file as a Blob (streamed from disk for OPFS). */
  assemble(mime: string): Promise<Blob>;
  clear(): Promise<void>;
}
