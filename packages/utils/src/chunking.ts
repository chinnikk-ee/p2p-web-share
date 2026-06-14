/** Pure chunk-arithmetic helpers (no I/O, no global state). */

export function computeTotalChunks(fileSize: number, chunkSize: number): number {
  if (chunkSize <= 0) throw new Error('chunkSize must be positive');
  if (fileSize < 0) throw new Error('fileSize must be non-negative');
  return Math.ceil(fileSize / chunkSize);
}

export interface ChunkRange {
  index: number;
  start: number;
  /** Exclusive end offset. */
  end: number;
  size: number;
}

export function chunkRangeAt(index: number, chunkSize: number, fileSize: number): ChunkRange {
  const start = index * chunkSize;
  const end = Math.min(start + chunkSize, fileSize);
  return { index, start, end, size: Math.max(0, end - start) };
}

/** Lazily iterate all chunk ranges for a file. */
export function* iterateChunks(fileSize: number, chunkSize: number): Generator<ChunkRange> {
  const total = computeTotalChunks(fileSize, chunkSize);
  for (let index = 0; index < total; index += 1) {
    yield chunkRangeAt(index, chunkSize, fileSize);
  }
}
