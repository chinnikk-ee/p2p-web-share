import { STORAGE } from '@p2p/shared';
import { IndexedDbChunkStore } from './IndexedDbChunkStore.js';
import { MemoryChunkStore } from './MemoryChunkStore.js';
import { OpfsChunkStore } from './OpfsChunkStore.js';
import type { ChunkStore, ChunkStoreParams, StorageKind } from './types.js';

/**
 * Picks the best available storage backend:
 *   - small files            → memory (fastest)
 *   - large + OPFS support   → OPFS (flat memory, streams to disk)
 *   - large, no OPFS         → IndexedDB
 * `forceKind` is used on resume to match the backend that already holds data.
 */
export function createChunkStore(params: ChunkStoreParams, forceKind?: StorageKind): ChunkStore {
  if (forceKind === 'opfs' && OpfsChunkStore.isSupported()) return new OpfsChunkStore(params);
  if (forceKind === 'indexeddb' && typeof indexedDB !== 'undefined')
    return new IndexedDbChunkStore(params);
  if (forceKind === 'memory') return new MemoryChunkStore(params);

  if (params.fileSize <= STORAGE.MEMORY_MAX) return new MemoryChunkStore(params);
  if (OpfsChunkStore.isSupported()) return new OpfsChunkStore(params);
  if (typeof indexedDB !== 'undefined') return new IndexedDbChunkStore(params);
  return new MemoryChunkStore(params);
}
