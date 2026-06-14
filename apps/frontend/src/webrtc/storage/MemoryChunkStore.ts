import type { ChunkBytes, ChunkStore, ChunkStoreParams } from './types.js';

/** Fastest store — keeps all chunks in RAM. Used for small files only. */
export class MemoryChunkStore implements ChunkStore {
  readonly kind = 'memory' as const;
  private readonly chunks = new Map<number, ChunkBytes>();

  constructor(private readonly params: ChunkStoreParams) {}

  async init(): Promise<void> {
    /* nothing to set up */
  }

  async put(index: number, data: ChunkBytes): Promise<void> {
    this.chunks.set(index, data);
  }

  async getStoredIndices(): Promise<number[]> {
    return [...this.chunks.keys()].sort((a, b) => a - b);
  }

  async assemble(mime: string): Promise<Blob> {
    const parts: BlobPart[] = [];
    for (let index = 0; index < this.params.totalChunks; index += 1) {
      const chunk = this.chunks.get(index);
      if (!chunk) throw new Error(`Missing chunk ${index} during assembly`);
      parts.push(chunk);
    }
    return new Blob(parts, { type: mime });
  }

  async clear(): Promise<void> {
    this.chunks.clear();
  }
}
