import type { ProtocolError } from './common.js';
import type {
  CreateRoomPayload,
  IncomingSignalPayload,
  JoinRoomPayload,
  PeerJoinedPayload,
  PeerLeftPayload,
  RelaySignalPayload,
  RoomClosedPayload,
  RoomCreatedPayload,
  RoomJoinedPayload,
} from './signaling.js';

/**
 * Canonical Socket.io event names. Using a frozen map keeps the wire protocol
 * stringly-typed in exactly one place — no magic strings scattered around.
 */
export const SIGNAL_EVENTS = {
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  RELAY_SIGNAL: 'signal:relay',
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  PEER_JOINED: 'peer:joined',
  PEER_LEFT: 'peer:left',
  ROOM_CLOSED: 'room:closed',
  INCOMING_SIGNAL: 'signal:incoming',
} as const;

export type SignalEvent = (typeof SIGNAL_EVENTS)[keyof typeof SIGNAL_EVENTS];

/** Discriminated acknowledgement returned through Socket.io callbacks. */
export type AckResponse<T> = { ok: true; data: T } | { ok: false; error: ProtocolError };
export type Ack<T> = (response: AckResponse<T>) => void;

/** Events the client emits to the server (with typed ack callbacks). */
export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload, ack: Ack<RoomCreatedPayload>) => void;
  'room:join': (payload: JoinRoomPayload, ack: Ack<RoomJoinedPayload>) => void;
  'room:leave': (ack: Ack<{ left: true }>) => void;
  'signal:relay': (payload: RelaySignalPayload, ack: Ack<{ delivered: boolean }>) => void;
}

/** Events the server pushes to clients. */
export interface ServerToClientEvents {
  'peer:joined': (payload: PeerJoinedPayload) => void;
  'peer:left': (payload: PeerLeftPayload) => void;
  'room:closed': (payload: RoomClosedPayload) => void;
  'signal:incoming': (payload: IncomingSignalPayload) => void;
}

/** Reserved for future server-to-server scaling (Redis adapter, etc.). */
export type InterServerEvents = Record<string, never>;

/** Per-connection state stored on `socket.data`. */
export interface SocketData {
  peerId: string;
  roomId: string | null;
}
