import { TIMING } from '@p2p/shared';
import type { ChunkHeader, FileManifest, TransferMessage } from '@p2p/types';
import { TypedEmitter, decryptChunk, sha256Hex } from '@p2p/utils';
import { decodeMessage, encodeMessage } from './protocol.js';
import { hashBlob } from './hashBlob.js';
import { SpeedMeter } from './SpeedMeter.js';
import { ResumeStore } from './storage/ResumeStore.js';
import { createChunkStore } from './storage/selectStore.js';
import type { ChunkStore } from './storage/types.js';
import { EMPTY_STATS, type TransferPhase, type TransferStats } from './types.js';

interface ReceiverEvents {
  stats: TransferStats;
  phase: TransferPhase;
  manifest: FileManifest;
  done: { blob: Blob; name: string; fileHash: string };
  failed: Error;
  log: string;
}

/**
 * Receives one file from a peer. Decrypts + verifies each chunk on arrival,
 * persists it through the chosen ChunkStore (memory/OPFS/IndexedDB), then on
 * completion reassembles, re-hashes the whole file, reports the verification
 * result to the sender, and auto-downloads on success.
 */
export class FileReceiver extends TypedEmitter<ReceiverEvents> {
  private readonly meter = new SpeedMeter(TIMING.SPEED_SAMPLE_WINDOW_MS);
  private readonly received = new Set<number>();
  private store: ChunkStore | null = null;
  private manifest: FileManifest | null = null;
  private pendingHeader: ChunkHeader | null = null;
  private completeMessage: { fileHash: string; totalChunks: number } | null = null;
  private finalized = false;

  constructor(
    private readonly channel: RTCDataChannel,
    private readonly roomId: string,
    private readonly key: CryptoKey | null,
  ) {
    super();
    this.channel.binaryType = 'arraybuffer';
    this.channel.addEventListener('message', this.onMessage);
  }

  dispose(): void {
    this.channel.removeEventListener('message', this.onMessage);
  }

  private readonly onMessage = (event: MessageEvent): void => {
    if (typeof event.data === 'string') {
      const message = decodeMessage(event.data);
      if (message) void this.handleControl(message);
    } else if (event.data instanceof ArrayBuffer) {
      void this.handleBinary(event.data);
    }
  };

  private async handleControl(message: TransferMessage): Promise<void> {
    switch (message.kind) {
      case 'manifest':
        await this.onManifest(message);
        break;
      case 'chunk':
        this.pendingHeader = message;
        break;
      case 'complete':
        this.completeMessage = { fileHash: message.fileHash, totalChunks: message.totalChunks };
        await this.tryFinalize();
        break;
      case 'cancel':
        this.emit('failed', new Error(message.reason ?? 'Sender cancelled the transfer'));
        break;
      case 'pause':
        this.emit('phase', 'paused');
        break;
      case 'resume':
        this.emit('phase', 'transferring');
        break;
      case 'error':
        this.emit('failed', new Error(message.message));
        break;
      default:
        break;
    }
  }

  private async onManifest(manifest: FileManifest): Promise<void> {
    if (manifest.encrypted && !this.key) {
      this.emit('failed', new Error('This transfer is encrypted but no key was provided in the link'));
      return;
    }
    this.manifest = manifest;
    this.emit('manifest', manifest);

    // Resume: reuse the prior store/file if the link points at the same file.
    const resume = await ResumeStore.load(this.roomId);
    const matches =
      resume &&
      resume.manifest.name === manifest.name &&
      resume.manifest.size === manifest.size &&
      resume.manifest.chunkSize === manifest.chunkSize;

    const transferId = matches ? resume.transferId : manifest.transferId;
    this.store = createChunkStore(
      {
        transferId,
        fileSize: manifest.size,
        chunkSize: manifest.chunkSize,
        totalChunks: manifest.totalChunks,
      },
      matches ? resume.storageKind : undefined,
    );
    await this.store.init();

    const stored = await this.store.getStoredIndices();
    stored.forEach((index) => this.received.add(index));

    await ResumeStore.save({
      roomId: this.roomId,
      transferId,
      storageKind: this.store.kind,
      manifest,
      updatedAt: Date.now(),
    });

    if (stored.length > 0) this.emit('log', `Resuming — ${stored.length} chunks already saved`);
    this.emit('phase', 'transferring');
    this.send(encodeMessage({ kind: 'ready', resumeFrom: stored }));
    this.emitStats();
  }

  private async handleBinary(buffer: ArrayBuffer): Promise<void> {
    const header = this.pendingHeader;
    this.pendingHeader = null;
    if (!header || !this.store || !this.manifest) return;
    if (this.received.has(header.index)) return; // duplicate (resend race)

    let plaintext: Uint8Array<ArrayBuffer>;
    try {
      if (this.manifest.encrypted) {
        if (!this.key || !header.iv) throw new Error('Missing decryption key or IV');
        plaintext = new Uint8Array(await decryptChunk(this.key, buffer, header.iv));
      } else {
        plaintext = new Uint8Array(buffer);
      }
    } catch {
      this.send(encodeMessage({ kind: 'request', indices: [header.index] }));
      this.emit('log', `Failed to decrypt chunk ${header.index}; requested resend`);
      return;
    }

    const hash = await sha256Hex(plaintext);
    if (hash !== header.hash) {
      this.send(encodeMessage({ kind: 'request', indices: [header.index] }));
      this.emit('log', `Chunk ${header.index} hash mismatch; requested resend`);
      return;
    }

    await this.store.put(header.index, plaintext);
    this.received.add(header.index);
    this.meter.record(plaintext.byteLength);
    this.send(encodeMessage({ kind: 'ack', index: header.index }));
    this.emitStats();

    if (this.completeMessage) await this.tryFinalize();
  }

  private async tryFinalize(): Promise<void> {
    if (this.finalized || !this.completeMessage || !this.store || !this.manifest) return;
    const { totalChunks, fileHash: expected } = this.completeMessage;

    if (this.received.size < totalChunks) {
      const missing: number[] = [];
      for (let index = 0; index < totalChunks; index += 1) {
        if (!this.received.has(index)) missing.push(index);
      }
      if (missing.length > 0) {
        this.send(encodeMessage({ kind: 'request', indices: missing.slice(0, 64) }));
        return;
      }
    }

    this.finalized = true;
    this.emit('phase', 'verifying');
    const blob = await this.store.assemble(this.manifest.mime);
    const actual = await hashBlob(blob, this.manifest.chunkSize);
    const ok = actual === expected;

    this.send(encodeMessage({ kind: 'verified', ok, fileHash: actual }));
    if (ok) {
      await ResumeStore.delete(this.roomId);
      this.emit('phase', 'completed');
      this.emit('done', { blob, name: this.manifest.name, fileHash: actual });
    } else {
      this.finalized = false;
      this.emit('failed', new Error('Whole-file hash verification failed'));
    }
  }

  private emitStats(): void {
    if (!this.manifest) return;
    const { size, chunkSize, totalChunks } = this.manifest;
    const transferred = Math.min(size, this.received.size * chunkSize);
    const remaining = Math.max(0, size - transferred);
    const stats: TransferStats = {
      ...EMPTY_STATS,
      totalBytes: size,
      transferredBytes: transferred,
      percent: totalChunks > 0 ? this.received.size / totalChunks : 0,
      bytesPerSecond: this.meter.instantBytesPerSecond,
      averageBytesPerSecond: this.meter.averageBytesPerSecond,
      etaSeconds: this.meter.etaSeconds(remaining),
      currentChunk: this.received.size,
      totalChunks,
    };
    this.emit('stats', stats);
  }

  private send(data: string): void {
    if (this.channel.readyState === 'open') this.channel.send(data);
  }
}
