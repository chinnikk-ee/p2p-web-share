import type { ChunkBytes, ChunkStore, ChunkStoreParams } from './types.js';

const DB_NAME = 'p2p-web-share';
const STORE_NAME = 'chunks';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * Persists chunks to IndexedDB keyed by `${transferId}:${index}`. The fallback
 * for large files when OPFS is unavailable (e.g. Firefox without OPFS write
 * support). Survives reloads, enabling cross-session resume.
 */
export class IndexedDbChunkStore implements ChunkStore {
  readonly kind = 'indexeddb' as const;
  private db: IDBDatabase | null = null;

  constructor(private readonly params: ChunkStoreParams) {}

  async init(): Promise<void> {
    this.db = await openDb();
  }

  private key(index: number): string {
    return `${this.params.transferId}:${index}`;
  }

  async put(index: number, data: ChunkBytes): Promise<void> {
    const db = this.requireDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, this.key(index));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put failed'));
    });
  }

  async getStoredIndices(): Promise<number[]> {
    const db = this.requireDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const range = IDBKeyRange.bound(`${this.params.transferId}:`, `${this.params.transferId}:￿`);
    const keys = await promisifyRequest(tx.objectStore(STORE_NAME).getAllKeys(range));
    return keys
      .filter((key): key is string => typeof key === 'string')
      .map((key) => Number.parseInt(key.split(':')[1] ?? '', 10))
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => a - b);
  }

  async assemble(mime: string): Promise<Blob> {
    const db = this.requireDb();
    const parts: BlobPart[] = [];
    for (let index = 0; index < this.params.totalChunks; index += 1) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const value = await promisifyRequest<unknown>(tx.objectStore(STORE_NAME).get(this.key(index)));
      if (!value) throw new Error(`Missing chunk ${index} during assembly`);
      parts.push(value as BlobPart);
    }
    return new Blob(parts, { type: mime });
  }

  async clear(): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const range = IDBKeyRange.bound(`${this.params.transferId}:`, `${this.params.transferId}:￿`);
    store.delete(range);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private requireDb(): IDBDatabase {
    if (!this.db) throw new Error('IndexedDbChunkStore not initialized');
    return this.db;
  }
}
