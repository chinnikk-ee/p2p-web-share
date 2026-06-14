import { BACKPRESSURE, TIMING } from '@p2p/shared';
import type { FileManifest } from '@p2p/types';
import {
  FileHasher,
  TypedEmitter,
  chunkRangeAt,
  encryptChunk,
  sha256Hex,
} from '@p2p/utils';
import { encodeMessage, decodeMessage } from './protocol.js';
import { SpeedMeter } from './SpeedMeter.js';
import { EMPTY_STATS, type TransferPhase, type TransferStats } from './types.js';

interface SenderEvents {
  stats: TransferStats;
  phase: TransferPhase;
  done: { fileHash: string };
  failed: Error;
  log: string;
}

/**
 * Streams one file to one peer over a data channel. Reads the file chunk by
 * chunk (never fully in memory), optionally AES-GCM encrypts each chunk, sends
 * a hash header + binary payload, and honors backpressure via
 * `bufferedAmount`. Computes the authoritative whole-file SHA-256 as it reads,
 * so resumed/ skipped chunks are still covered by the final hash.
 */
export class FileSender extends TypedEmitter<SenderEvents> {
  private readonly meter = new SpeedMeter(TIMING.SPEED_SAMPLE_WINDOW_MS);
  private readonly resumeFrom = new Set<number>();
  private sentChunks = 0;
  private cancelled = false;
  private paused = false;
  private finished = false;
  private readyResolve: (() => void) | null = null;
  private resumeResolve: (() => void) | null = null;

  constructor(
    private readonly file: File,
    private readonly channel: RTCDataChannel,
    private readonly manifest: FileManifest,
    private readonly key: CryptoKey | null,
  ) {
    super();
    this.channel.binaryType = 'arraybuffer';
    this.channel.bufferedAmountLowThreshold = BACKPRESSURE.LOW_WATER;
    this.channel.addEventListener('message', this.onMessage);
  }

  /** Begin the transfer: send manifest, await receiver readiness, stream chunks. */
  async run(): Promise<void> {
    try {
      this.send(encodeMessage(this.manifest));
      this.emit('phase', 'negotiating');
      await this.waitForReady();
      if (this.cancelled) return;

      this.emit('phase', 'transferring');
      const hasher = new FileHasher();
      const { chunkSize, totalChunks, size } = this.manifest;

      for (let index = 0; index < totalChunks; index += 1) {
        if (this.cancelled) return;
        await this.waitWhilePaused();

        const { start, end } = chunkRangeAt(index, chunkSize, size);
        const plaintext = new Uint8Array(await this.file.slice(start, end).arrayBuffer());
        hasher.update(plaintext);

        if (!this.resumeFrom.has(index)) {
          await this.sendChunk(index, plaintext);
          this.meter.record(plaintext.byteLength);
          this.sentChunks += 1;
        }
        this.emitStats(index + 1, end);
      }

      const fileHash = hasher.finalizeHex();
      this.send(encodeMessage({ kind: 'complete', fileHash, totalChunks }));
      this.emit('phase', 'verifying');
    } catch (err) {
      if (!this.cancelled) this.emit('failed', toError(err));
    }
  }

  pause(): void {
    if (this.paused || this.finished) return;
    this.paused = true;
    this.send(encodeMessage({ kind: 'pause' }));
    this.emit('phase', 'paused');
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.send(encodeMessage({ kind: 'resume' }));
    this.emit('phase', 'transferring');
    this.resumeResolve?.();
    this.resumeResolve = null;
  }

  cancel(reason = 'cancelled'): void {
    if (this.finished) return;
    this.cancelled = true;
    this.send(encodeMessage({ kind: 'cancel', reason }));
    this.cleanup();
  }

  dispose(): void {
    this.channel.removeEventListener('message', this.onMessage);
    this.readyResolve?.();
    this.resumeResolve?.();
  }

  private readonly onMessage = (event: MessageEvent): void => {
    if (typeof event.data !== 'string') return; // sender only receives control frames
    const message = decodeMessage(event.data);
    if (!message) return;

    switch (message.kind) {
      case 'ready':
        message.resumeFrom.forEach((index) => this.resumeFrom.add(index));
        if (message.resumeFrom.length > 0) {
          this.emit('log', `Resuming — receiver already has ${message.resumeFrom.length} chunks`);
        }
        this.readyResolve?.();
        this.readyResolve = null;
        break;
      case 'request':
        void this.resendChunks(message.indices);
        break;
      case 'verified':
        this.finished = true;
        if (message.ok) this.emit('done', { fileHash: message.fileHash });
        else this.emit('failed', new Error('Receiver reported a hash mismatch'));
        this.cleanup();
        break;
      case 'cancel':
        this.cancelled = true;
        this.emit('failed', new Error(message.reason ?? 'Peer cancelled the transfer'));
        this.cleanup();
        break;
      default:
        break;
    }
  };

  private async sendChunk(index: number, plaintext: Uint8Array<ArrayBuffer>): Promise<void> {
    let payload: ArrayBuffer;
    let iv: string | undefined;

    if (this.key) {
      const encrypted = await encryptChunk(this.key, plaintext);
      payload = encrypted.ciphertext;
      iv = encrypted.iv;
    } else {
      payload = plaintext.buffer.slice(
        plaintext.byteOffset,
        plaintext.byteOffset + plaintext.byteLength,
      );
    }

    const hash = await sha256Hex(plaintext);
    await this.applyBackpressure();
    if (this.channel.readyState !== 'open') throw new Error('Data channel closed mid-transfer');

    this.send(
      encodeMessage({
        kind: 'chunk',
        index,
        byteLength: payload.byteLength,
        hash,
        ...(iv ? { iv } : {}),
      }),
    );
    this.channel.send(payload);
  }

  /** Re-read and resend specific chunks (hash-mismatch recovery / mesh). */
  private async resendChunks(indices: number[]): Promise<void> {
    const { chunkSize, size } = this.manifest;
    for (const index of indices) {
      if (this.cancelled) return;
      const { start, end } = chunkRangeAt(index, chunkSize, size);
      const plaintext = new Uint8Array(await this.file.slice(start, end).arrayBuffer());
      await this.sendChunk(index, plaintext);
    }
  }

  private applyBackpressure(): Promise<void> {
    if (this.channel.bufferedAmount < BACKPRESSURE.HIGH_WATER) return Promise.resolve();
    return new Promise((resolve) => {
      const handler = (): void => {
        this.channel.removeEventListener('bufferedamountlow', handler);
        resolve();
      };
      this.channel.addEventListener('bufferedamountlow', handler);
    });
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyResolve = null;
        reject(new Error('Timed out waiting for the receiver'));
      }, TIMING.CONNECTION_TIMEOUT_MS);
      this.readyResolve = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  private waitWhilePaused(): Promise<void> {
    if (!this.paused) return Promise.resolve();
    return new Promise((resolve) => {
      this.resumeResolve = resolve;
    });
  }

  private emitStats(currentChunk: number, processedBytes: number): void {
    const total = this.manifest.size;
    const remaining = Math.max(0, total - processedBytes);
    const stats: TransferStats = {
      ...EMPTY_STATS,
      totalBytes: total,
      transferredBytes: processedBytes,
      percent: total > 0 ? processedBytes / total : 0,
      bytesPerSecond: this.meter.instantBytesPerSecond,
      averageBytesPerSecond: this.meter.averageBytesPerSecond,
      etaSeconds: this.meter.etaSeconds(remaining),
      currentChunk,
      totalChunks: this.manifest.totalChunks,
    };
    this.emit('stats', stats);
  }

  private send(data: string): void {
    if (this.channel.readyState === 'open') this.channel.send(data);
  }

  private cleanup(): void {
    this.channel.removeEventListener('message', this.onMessage);
  }
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
