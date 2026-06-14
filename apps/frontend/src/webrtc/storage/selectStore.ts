import { STORAGE } from '@p2p/shared';
import { IndexedDbChunkStore } from './IndexedDbChunkStore.js';
import { MemoryChunkStore } from './MemoryChunkStore.js';
import { OpfsChunkStore } from './OpfsChunkStore.js';
import type { ChunkStore, ChunkStoreParams, StorageKind } from './types.js';

/**
 * Picks the best available storage backend:
 *   - small files            → memory (fastest)
 *   - large + IndexedDB      → IndexedDB (durable per chunk → resumable)
 *   - large, no IndexedDB    → OPFS (flat memory, streams to disk)
 * `forceKind` is used on resume to match the backend that already holds data.
 *
 * IndexedDB is preferred over OPFS for large files because it commits every
 * chunk in its own transaction, so a mid-transfer reload can resume from the
 * last saved chunk. OPFS keeps a single writable open and only flushes to disk
 * on close() at the end of the transfer, so an interrupted OPFS download has
 * nothing persisted and would restart from 0%.
 */
export function createChunkStore(params: ChunkStoreParams, forceKind?: StorageKind): ChunkStore {
  if (forceKind === 'indexeddb' && typeof indexedDB !== 'undefined')
    return new IndexedDbChunkStore(params);
  if (forceKind === 'opfs' && OpfsChunkStore.isSupported()) return new OpfsChunkStore(params);
  if (forceKind === 'memory') return new MemoryChunkStore(params);

  if (params.fileSize <= STORAGE.MEMORY_MAX) return new MemoryChunkStore(params);
  if (typeof indexedDB !== 'undefined') return new IndexedDbChunkStore(params);
  if (OpfsChunkStore.isSupported()) return new OpfsChunkStore(params);
  return new MemoryChunkStore(params);
}
