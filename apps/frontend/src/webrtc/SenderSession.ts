import { TIMING } from '@p2p/shared';
import type { FileManifest, SignalData } from '@p2p/types';
import {
  TypedEmitter,
  backoffDelay,
  computeTotalChunks,
  exportKeyToString,
  generateEncryptionKey,
  generateUuid,
} from '@p2p/utils';
import { initialChunkSize } from '@p2p/shared';
import { fetchIceConfiguration } from '@/lib/api';
import { FileSender } from './FileSender.js';
import { PeerConnection } from './PeerConnection.js';
import { SignalingClient } from './SignalingClient.js';
import type { ConnectionStatus, TransferPhase, TransferStats } from './types.js';

interface SenderSessionEvents {
  'room-ready': { roomId: string; shareUrl: string };
  connection: ConnectionStatus;
  'peer-added': { peerId: string };
  'peer-progress': { peerId: string; stats: TransferStats; phase: TransferPhase };
  'peer-done': { peerId: string };
  'peer-failed': { peerId: string; error: Error };
  'peer-left': { peerId: string };
  log: string;
  error: Error;
}

interface PeerSlot {
  pc: PeerConnection;
  sender: FileSender | null;
  status: ConnectionStatus;
  restartAttempts: number;
}

/**
 * Host-side orchestrator. Creates the room, derives the optional encryption
 * key, and — for every peer that joins — opens an independent encrypted data
 * channel and streams the file. Multiple peers download in parallel
 * (multi-peer broadcast). Recovers transient drops with ICE restart.
 */
export class SenderSession extends TypedEmitter<SenderSessionEvents> {
  private readonly signaling: SignalingClient;
  private readonly peers = new Map<string, PeerSlot>();
  private rtcConfig: RTCConfiguration = { iceServers: [] };
  private manifest: FileManifest | null = null;
  private key: CryptoKey | null = null;
  private roomId = '';
  private disposed = false;

  constructor(
    private readonly file: File,
    private readonly options: { encrypt: boolean; signalingUrl: string },
  ) {
    super();
    this.signaling = new SignalingClient(options.signalingUrl);
  }

  async start(): Promise<void> {
    this.emit('connection', 'connecting');
    this.rtcConfig = await fetchIceConfiguration();

    if (this.options.encrypt) {
      this.key = await generateEncryptionKey();
    }

    const transferId = generateUuid();
    const chunkSize = initialChunkSize(this.file.size);
    this.manifest = {
      kind: 'manifest',
      transferId,
      name: this.file.name,
      size: this.file.size,
      mime: this.file.type || 'application/octet-stream',
      totalChunks: computeTotalChunks(this.file.size, chunkSize),
      chunkSize,
      encrypted: this.options.encrypt,
      hashAlgorithm: 'SHA-256',
    };

    this.signaling.on('peer-joined', (peer) => void this.addPeer(peer.id));
    this.signaling.on('peer-left', (peerId) => this.removePeer(peerId));
    this.signaling.on('signal', ({ from, signal }) => void this.routeSignal(from, signal));
    this.signaling.on('disconnected', () => this.emit('connection', 'reconnecting'));
    this.signaling.on('connected', () => this.emit('log', 'Signaling reconnected'));

    await this.signaling.connect();
    const room = await this.signaling.createRoom();
    this.roomId = room.roomId;

    const shareUrl = await this.buildShareUrl(room.roomId);
    this.emit('room-ready', { roomId: room.roomId, shareUrl });
    this.emit('connection', 'waiting');
  }

  get roomIdValue(): string {
    return this.roomId;
  }

  private async buildShareUrl(roomId: string): Promise<string> {
    const base = `${window.location.origin}/room/${roomId}`;
    if (!this.key) return base;
    const keyString = await exportKeyToString(this.key);
    return `${base}#k=${keyString}`;
  }

  private async addPeer(peerId: string): Promise<void> {
    if (this.disposed || !this.manifest) return;
    this.removePeer(peerId); // clear any stale slot for a rejoining peer

    const pc = new PeerConnection(this.rtcConfig, true);
    const slot: PeerSlot = { pc, sender: null, status: 'connecting', restartAttempts: 0 };
    this.peers.set(peerId, slot);
    this.emit('peer-added', { peerId });
    this.emit('connection', 'connecting');

    pc.on('signal', (signal) => void this.signaling.relay(peerId, signal));
    pc.on('statechange', (state) => this.onPeerState(peerId, state));
    pc.on('open', () => this.startSending(peerId));

    await pc.start();
  }

  private startSending(peerId: string): void {
    const slot = this.peers.get(peerId);
    if (!slot || slot.sender || !slot.pc.dataChannel || !this.manifest) return;

    slot.status = 'connected';
    this.emit('connection', 'connected');
    const sender = new FileSender(this.file, slot.pc.dataChannel, this.manifest, this.key);
    slot.sender = sender;

    sender.on('stats', (stats) =>
      this.emit('peer-progress', { peerId, stats, phase: 'transferring' }),
    );
    sender.on('phase', (phase) =>
      this.emit('peer-progress', { peerId, stats: this.lastStats(peerId), phase }),
    );
    sender.on('done', () => this.emit('peer-done', { peerId }));
    sender.on('failed', (error) => this.emit('peer-failed', { peerId, error }));
    sender.on('log', (message) => this.emit('log', message));
    void sender.run();
  }

  private lastStats(peerId: string): TransferStats {
    void peerId;
    return {
      totalBytes: this.file.size,
      transferredBytes: 0,
      percent: 0,
      bytesPerSecond: 0,
      averageBytesPerSecond: 0,
      etaSeconds: Infinity,
      currentChunk: 0,
      totalChunks: this.manifest?.totalChunks ?? 0,
    };
  }

  private async routeSignal(from: string, signal: SignalData): Promise<void> {
    const slot = this.peers.get(from);
    if (slot) await slot.pc.handleSignal(signal);
  }

  private onPeerState(peerId: string, state: RTCPeerConnectionState): void {
    const slot = this.peers.get(peerId);
    if (!slot) return;
    if (state === 'disconnected') {
      slot.status = 'reconnecting';
      this.scheduleIceRestart(peerId);
    } else if (state === 'failed') {
      slot.status = 'failed';
      this.emit('peer-failed', { peerId, error: new Error('Connection failed') });
    } else if (state === 'connected') {
      slot.restartAttempts = 0;
    }
  }

  private scheduleIceRestart(peerId: string): void {
    const slot = this.peers.get(peerId);
    if (!slot || slot.restartAttempts >= TIMING.ICE_RESTART_MAX_ATTEMPTS) return;
    const attempt = slot.restartAttempts++;
    const delay = backoffDelay(attempt, TIMING.RECONNECT_BACKOFF_BASE_MS, TIMING.RECONNECT_BACKOFF_MAX_MS);
    setTimeout(() => {
      const current = this.peers.get(peerId);
      if (current && current.pc.connectionState !== 'connected') {
        this.emit('log', `Attempting ICE restart for peer (try ${attempt + 1})`);
        void current.pc.restartIce();
      }
    }, delay);
  }

  private removePeer(peerId: string): void {
    const slot = this.peers.get(peerId);
    if (!slot) return;
    slot.sender?.dispose();
    slot.pc.close();
    this.peers.delete(peerId);
    this.emit('peer-left', { peerId });
  }

  cancel(): void {
    for (const slot of this.peers.values()) slot.sender?.cancel();
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    for (const slot of this.peers.values()) {
      slot.sender?.dispose();
      slot.pc.close();
    }
    this.peers.clear();
    await this.signaling.leave();
    this.signaling.disconnect();
    this.removeAllListeners();
  }
}
