import { TIMING } from '@p2p/shared';
import type { FileManifest, SignalData } from '@p2p/types';
import { TypedEmitter, backoffDelay, importKeyFromString } from '@p2p/utils';
import { fetchIceConfiguration } from '@/lib/api';
import { FileReceiver } from './FileReceiver.js';
import { PeerConnection } from './PeerConnection.js';
import { SignalingClient } from './SignalingClient.js';
import type { ConnectionStatus, TransferPhase, TransferStats } from './types.js';

interface ReceiverSessionEvents {
  connection: ConnectionStatus;
  manifest: FileManifest;
  progress: { stats: TransferStats; phase: TransferPhase };
  done: { blob: Blob; name: string; fileHash: string };
  failed: Error;
  log: string;
}

/**
 * Guest-side orchestrator. Joins the room, answers the host's offer, wires up
 * the FileReceiver, and surfaces a unified progress/done/failed stream. Auto
 * ICE-restart for transient drops; `retry()` re-joins to recover hard drops,
 * resuming from chunks already persisted under this room link.
 */
export class ReceiverSession extends TypedEmitter<ReceiverSessionEvents> {
  private readonly signaling: SignalingClient;
  private rtcConfig: RTCConfiguration = { iceServers: [] };
  private pc: PeerConnection | null = null;
  private receiver: FileReceiver | null = null;
  private key: CryptoKey | null = null;
  private hostPeerId: string | null = null;
  private restartAttempts = 0;
  private disposed = false;

  constructor(
    private readonly roomId: string,
    private readonly options: { keyString?: string; signalingUrl: string },
  ) {
    super();
    this.signaling = new SignalingClient(options.signalingUrl);
  }

  async start(): Promise<void> {
    this.emit('connection', 'connecting');
    this.rtcConfig = await fetchIceConfiguration();

    if (this.options.keyString) {
      try {
        this.key = await importKeyFromString(this.options.keyString);
      } catch {
        this.emit('failed', new Error('The decryption key in the link is invalid'));
        return;
      }
    }

    this.signaling.on('signal', ({ from, signal }) => void this.onSignal(from, signal));
    this.signaling.on('peer-left', (peerId) => {
      if (peerId === this.hostPeerId) this.emit('connection', 'reconnecting');
    });
    this.signaling.on('room-closed', () =>
      this.emit('failed', new Error('The room was closed by the host or expired')),
    );
    this.signaling.on('disconnected', () => this.emit('connection', 'reconnecting'));

    await this.signaling.connect();
    try {
      await this.signaling.joinRoom(this.roomId);
      this.emit('connection', 'waiting');
      this.emit('log', 'Joined room — waiting for the sender');
    } catch (err) {
      this.emit('failed', err instanceof Error ? err : new Error('Failed to join the room'));
    }
  }

  private async onSignal(from: string, signal: SignalData): Promise<void> {
    if (this.disposed) return;
    if (!this.pc) this.createPeerConnection(from);
    this.hostPeerId = from;
    await this.pc?.handleSignal(signal);
  }

  private createPeerConnection(hostPeerId: string): void {
    const pc = new PeerConnection(this.rtcConfig, false);
    this.pc = pc;
    this.hostPeerId = hostPeerId;
    this.emit('connection', 'connecting');

    pc.on('signal', (signal) => {
      if (this.hostPeerId) void this.signaling.relay(this.hostPeerId, signal);
    });
    pc.on('statechange', (state) => this.onPeerState(state));
    pc.on('datachannel', (channel) => this.attachReceiver(channel));
  }

  private attachReceiver(channel: RTCDataChannel): void {
    this.emit('connection', 'connected');
    const receiver = new FileReceiver(channel, this.roomId, this.key);
    this.receiver = receiver;

    receiver.on('manifest', (manifest) => this.emit('manifest', manifest));
    receiver.on('stats', (stats) => this.emit('progress', { stats, phase: 'transferring' }));
    receiver.on('phase', (phase) =>
      this.emit('progress', { stats: EMPTY_RECEIVER_STATS, phase }),
    );
    receiver.on('done', (payload) => {
      this.emit('connection', 'connected');
      this.emit('done', payload);
    });
    receiver.on('failed', (error) => this.emit('failed', error));
    receiver.on('log', (message) => this.emit('log', message));
  }

  private onPeerState(state: RTCPeerConnectionState): void {
    if (state === 'disconnected') {
      this.emit('connection', 'reconnecting');
      this.scheduleIceRestart();
    } else if (state === 'failed') {
      this.emit('connection', 'failed');
    } else if (state === 'connected') {
      this.restartAttempts = 0;
      this.emit('connection', 'connected');
    }
  }

  private scheduleIceRestart(): void {
    if (this.restartAttempts >= TIMING.ICE_RESTART_MAX_ATTEMPTS) return;
    const attempt = this.restartAttempts++;
    const delay = backoffDelay(
      attempt,
      TIMING.RECONNECT_BACKOFF_BASE_MS,
      TIMING.RECONNECT_BACKOFF_MAX_MS,
    );
    setTimeout(() => {
      if (this.pc && this.pc.connectionState !== 'connected') {
        this.emit('log', `Attempting to recover the connection (try ${attempt + 1})`);
        void this.pc.restartIce();
      }
    }, delay);
  }

  /** Hard-drop recovery: tear down and re-join. Resume picks up persisted chunks. */
  async retry(): Promise<void> {
    this.receiver?.dispose();
    this.pc?.close();
    this.receiver = null;
    this.pc = null;
    this.hostPeerId = null;
    this.restartAttempts = 0;
    await this.signaling.leave();
    this.emit('connection', 'connecting');
    try {
      await this.signaling.joinRoom(this.roomId);
      this.emit('connection', 'waiting');
    } catch (err) {
      this.emit('failed', err instanceof Error ? err : new Error('Retry failed'));
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.receiver?.dispose();
    this.pc?.close();
    await this.signaling.leave();
    this.signaling.disconnect();
    this.removeAllListeners();
  }
}

const EMPTY_RECEIVER_STATS: TransferStats = {
  totalBytes: 0,
  transferredBytes: 0,
  percent: 0,
  bytesPerSecond: 0,
  averageBytesPerSecond: 0,
  etaSeconds: Infinity,
  currentChunk: 0,
  totalChunks: 0,
};
