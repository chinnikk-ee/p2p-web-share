import { FileHasher } from '@p2p/utils';

/**
 * Computes the SHA-256 of a Blob by streaming it through the incremental
 * hasher in windows — never loads the whole blob into memory, so it works for
 * multi-gigabyte OPFS-backed files.
 */
export async function hashBlob(blob: Blob, windowSize: number): Promise<string> {
  const hasher = new FileHasher();
  const window = Math.max(windowSize, 64 * 1024);
  let offset = 0;
  while (offset < blob.size) {
    const buffer = await blob.slice(offset, offset + window).arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset += window;
  }
  return hasher.finalizeHex();
}
