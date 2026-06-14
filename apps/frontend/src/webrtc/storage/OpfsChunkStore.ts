import type { ChunkBytes, ChunkStore, ChunkStoreParams } from './types.js';

/**
 * Origin Private File System store. Writes chunks at their byte offset in a
 * single backing file, so memory stays flat regardless of file size — this is
 * what enables >500 MB transfers. The reassembled Blob streams directly from
 * the OPFS file.
 *
 * Note: `FileSystemWritableFileStream` commits on `close()`, so we keep one
 * writable open for the duration of the transfer and close it in `assemble()`.
 */
export class OpfsChunkStore implements ChunkStore {
  readonly kind = 'opfs' as const;
  private fileHandle: FileSystemFileHandle | null = null;
  private writable: FileSystemWritableFileStream | null = null;
  private readonly written = new Set<number>();

  constructor(private readonly params: ChunkStoreParams) {}

  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      typeof navigator.storage?.getDirectory === 'function' &&
      typeof FileSystemFileHandle !== 'undefined' &&
      'createWritable' in FileSystemFileHandle.prototype
    );
  }

  private get fileName(): string {
    return `transfer-${this.params.transferId}.bin`;
  }

  async init(): Promise<void> {
    const root = await navigator.storage.getDirectory();
    this.fileHandle = await root.getFileHandle(this.fileName, { create: true });
    this.writable = await this.fileHandle.createWritable({ keepExistingData: true });
    // Pre-seed `written` from any data persisted by a previous session.
    const existing = await this.fileHandle.getFile();
    if (existing.size > 0) {
      const fullChunks = Math.floor(existing.size / this.params.chunkSize);
      for (let i = 0; i < fullChunks && i < this.params.totalChunks; i += 1) this.written.add(i);
    }
  }

  async put(index: number, data: ChunkBytes): Promise<void> {
    if (!this.writable) throw new Error('OpfsChunkStore not initialized');
    await this.writable.write({ type: 'write', position: index * this.params.chunkSize, data });
    this.written.add(index);
  }

  async getStoredIndices(): Promise<number[]> {
    return [...this.written].sort((a, b) => a - b);
  }

  async assemble(mime: string): Promise<Blob> {
    if (this.writable) {
      await this.writable.close();
      this.writable = null;
    }
    if (!this.fileHandle) throw new Error('OpfsChunkStore not initialized');
    const file = await this.fileHandle.getFile();
    return file.slice(0, this.params.fileSize, mime);
  }

  async clear(): Promise<void> {
    try {
      await this.writable?.close();
    } catch {
      /* already closed */
    }
    this.writable = null;
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(this.fileName).catch(() => undefined);
  }
}
