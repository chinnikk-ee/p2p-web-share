import type { FileManifest } from '@p2p/types';
import type { StorageKind } from './types.js';

const DB_NAME = 'p2p-web-share-resume';
const STORE_NAME = 'resume';
const DB_VERSION = 1;

export interface ResumeRecord {
  roomId: string;
  transferId: string;
  storageKind: StorageKind;
  manifest: FileManifest;
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'roomId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open resume DB'));
  });
}

/**
 * Persists just enough metadata (keyed by room link) to resume an interrupted
 * download after a page reload: which file, which storage backend, and the
 * transfer id. The actual chunks live in the OPFS/IndexedDB chunk store.
 */
export class ResumeStore {
  static async save(record: ResumeRecord): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      db.close();
    } catch {
      /* resume is best-effort */
    }
  }

  static async load(roomId: string): Promise<ResumeRecord | null> {
    if (typeof indexedDB === 'undefined') return null;
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const record = await new Promise<ResumeRecord | undefined>((resolve, reject) => {
        const request = tx.objectStore(STORE_NAME).get(roomId) as IDBRequest<ResumeRecord>;
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Resume load failed'));
      });
      db.close();
      return record ?? null;
    } catch {
      return null;
    }
  }

  static async delete(roomId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(roomId);
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      db.close();
    } catch {
      /* ignore */
    }
  }
}
