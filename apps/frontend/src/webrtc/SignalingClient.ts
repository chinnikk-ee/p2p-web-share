import { io, type Socket } from 'socket.io-client';
import {
  SIGNAL_EVENTS,
  type AckResponse,
  type ClientToServerEvents,
  type ErrorCode,
  type IncomingSignalPayload,
  type PeerInfo,
  type RoomClosedPayload,
  type RoomCreatedPayload,
  type RoomJoinedPayload,
  type ServerToClientEvents,
  type SignalData,
} from '@p2p/types';
import { TypedEmitter } from '@p2p/utils';

export class SignalingError extends Error {
  constructor(
    readonly code: ErrorCode | 'TIMEOUT' | 'DISCONNECTED',
    message: string,
  ) {
    super(message);
    this.name = 'SignalingError';
  }
}

interface SignalingEvents {
  connected: void;
  disconnected: string;
  'peer-joined': PeerInfo;
  'peer-left': string;
  signal: IncomingSignalPayload;
  'room-closed': RoomClosedPayload;
}

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Thin, typed wrapper around socket.io-client. Translates the wire protocol
 * into a typed event emitter and promise-based request/ack helpers. Holds no
 * file data — only room/peer coordination.
 */
export class SignalingClient extends TypedEmitter<SignalingEvents> {
  private socket: ClientSocket | null = null;
  private readonly ackTimeoutMs = 10_000;

  constructor(private readonly url: string) {
    super();
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(): Promise<void> {
    if (this.socket?.connected) return Promise.resolve();
    const socket: ClientSocket = io(this.url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 8_000,
    });
    this.socket = socket;
    this.wire(socket);

    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', (err) =>
        reject(new SignalingError('DISCONNECTED', err.message)),
      );
    });
  }

  private wire(socket: ClientSocket): void {
    socket.on('connect', () => this.emit('connected', undefined));
    socket.on('disconnect', (reason) => this.emit('disconnected', reason));
    socket.on(SIGNAL_EVENTS.PEER_JOINED, (payload) => this.emit('peer-joined', payload.peer));
    socket.on(SIGNAL_EVENTS.PEER_LEFT, (payload) => this.emit('peer-left', payload.peerId));
    socket.on(SIGNAL_EVENTS.INCOMING_SIGNAL, (payload) => this.emit('signal', payload));
    socket.on(SIGNAL_EVENTS.ROOM_CLOSED, (payload) => this.emit('room-closed', payload));
  }

  async createRoom(label?: string): Promise<RoomCreatedPayload> {
    return this.request(SIGNAL_EVENTS.CREATE_ROOM, label ? { label } : {});
  }

  async joinRoom(roomId: string, label?: string): Promise<RoomJoinedPayload> {
    return this.request(SIGNAL_EVENTS.JOIN_ROOM, label ? { roomId, label } : { roomId });
  }

  /** Relays a signal to a specific peer; resolves to whether it was delivered. */
  async relay(to: string, signal: SignalData): Promise<boolean> {
    try {
      const result = await this.request<{ delivered: boolean }>(SIGNAL_EVENTS.RELAY_SIGNAL, {
        to,
        signal,
      });
      return result.delivered;
    } catch {
      // A peer that left mid-handshake is not a fatal error for the session.
      return false;
    }
  }

  async leave(): Promise<void> {
    if (!this.socket?.connected) return;
    try {
      await this.request(SIGNAL_EVENTS.LEAVE_ROOM, undefined);
    } catch {
      /* best-effort */
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.removeAllListeners();
  }

  private async request<T>(event: string, payload: unknown): Promise<T> {
    if (!this.socket?.connected) {
      throw new SignalingError('DISCONNECTED', 'Signaling socket is closed');
    }
    // The strongly-typed Socket signature does not model the generic ack
    // request/response shape, so route through a minimal structural type.
    const emitter = this.socket as unknown as {
      timeout: (ms: number) => {
        emitWithAck: (event: string, payload: unknown) => Promise<AckResponse<T>>;
      };
    };
    try {
      const response = await emitter.timeout(this.ackTimeoutMs).emitWithAck(event, payload);
      if (!response.ok) throw new SignalingError(response.error.code, response.error.message);
      return response.data;
    } catch (err) {
      if (err instanceof SignalingError) throw err;
      throw new SignalingError('TIMEOUT', 'Signaling request timed out');
    }
  }
}
