import type { Server, Socket } from 'socket.io';
import {
  SIGNAL_EVENTS,
  createRoomSchema,
  joinRoomSchema,
  relaySignalSchema,
  type Ack,
  type ClientToServerEvents,
  type ErrorCode,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from '@p2p/types';
import type { z } from 'zod';
import { type RoomManager, toPeerInfo } from './RoomManager.js';
import type { RateLimiter } from './RateLimiter.js';
import type { AppLogger } from '../lib/logger.js';

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Wires the Socket.io server to the RoomManager. Every inbound event is
 * rate-limited and Zod-validated before any state changes. The gateway only
 * ever relays opaque SDP/ICE blobs between peers — it cannot read file data
 * because file data never travels over this socket.
 */
export class SignalingGateway {
  constructor(
    private readonly io: AppServer,
    private readonly rooms: RoomManager,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: AppLogger,
  ) {}

  register(): void {
    this.io.on('connection', (socket) => this.onConnection(socket));
  }

  private onConnection(socket: AppSocket): void {
    socket.data.peerId = '';
    socket.data.roomId = null;
    this.logger.debug({ socketId: socket.id }, 'socket connected');

    socket.on(SIGNAL_EVENTS.CREATE_ROOM, (payload, ack) =>
      this.onCreateRoom(socket, payload, ack),
    );
    socket.on(SIGNAL_EVENTS.JOIN_ROOM, (payload, ack) => this.onJoinRoom(socket, payload, ack));
    socket.on(SIGNAL_EVENTS.RELAY_SIGNAL, (payload, ack) => this.onRelaySignal(socket, payload, ack));
    socket.on(SIGNAL_EVENTS.LEAVE_ROOM, (ack) => this.onLeave(socket, ack));
    socket.on('disconnect', (reason) => this.onDisconnect(socket, reason));
  }

  private onCreateRoom(
    socket: AppSocket,
    payload: unknown,
    ack: Ack<{ roomId: string; peerId: string; createdAt: number }>,
  ): void {
    const respond = safeAck(ack);
    if (!this.guard(socket, respond)) return;
    const data = this.validate(createRoomSchema, payload, respond);
    if (!data) return;

    const { room, peer } = this.rooms.createRoom(socket.id, data.label);
    socket.data.peerId = peer.id;
    socket.data.roomId = room.id;
    void socket.join(room.id);
    this.logger.info({ roomId: room.id, peerId: peer.id }, 'room created');
    respond({ ok: true, data: { roomId: room.id, peerId: peer.id, createdAt: room.createdAt } });
  }

  private onJoinRoom(
    socket: AppSocket,
    payload: unknown,
    ack: Ack<{ roomId: string; peerId: string; peers: ReturnType<typeof toPeerInfo>[] }>,
  ): void {
    const respond = safeAck(ack);
    if (!this.guard(socket, respond)) return;
    const data = this.validate(joinRoomSchema, payload, respond);
    if (!data) return;

    const result = this.rooms.joinRoom(data.roomId, socket.id, data.label);
    if (!result.ok) {
      respond({ ok: false, error: { code: result.reason, message: reasonMessage(result.reason) } });
      return;
    }

    const { room, peer } = result;
    socket.data.peerId = peer.id;
    socket.data.roomId = room.id;
    void socket.join(room.id);

    const peers = this.rooms.listPeers(room.id, peer.id);
    respond({ ok: true, data: { roomId: room.id, peerId: peer.id, peers } });

    // Notify existing peers so they can initiate the WebRTC offer.
    socket.to(room.id).emit(SIGNAL_EVENTS.PEER_JOINED, { peer: toPeerInfo(peer) });
    this.logger.info({ roomId: room.id, peerId: peer.id }, 'peer joined');
  }

  private onRelaySignal(
    socket: AppSocket,
    payload: unknown,
    ack: Ack<{ delivered: boolean }>,
  ): void {
    const respond = safeAck(ack);
    if (!this.guard(socket, respond)) return;
    const data = this.validate(relaySignalSchema, payload, respond);
    if (!data) return;

    const { roomId, peerId } = socket.data;
    if (!roomId || !peerId) {
      respond({ ok: false, error: { code: 'NOT_IN_ROOM', message: 'Join a room first' } });
      return;
    }

    const target = this.rooms.getPeer(roomId, data.to);
    if (!target) {
      respond({ ok: false, error: { code: 'PEER_NOT_FOUND', message: 'Target peer is gone' } });
      return;
    }

    this.io
      .to(target.connectionId)
      .emit(SIGNAL_EVENTS.INCOMING_SIGNAL, { from: peerId, signal: data.signal });
    this.rooms.touch(roomId);
    respond({ ok: true, data: { delivered: true } });
  }

  private onLeave(socket: AppSocket, ack: Ack<{ left: true }>): void {
    const respond = safeAck(ack);
    this.removeFromRoom(socket);
    respond({ ok: true, data: { left: true } });
  }

  private onDisconnect(socket: AppSocket, reason: string): void {
    this.logger.debug({ socketId: socket.id, reason }, 'socket disconnected');
    this.removeFromRoom(socket);
    this.rateLimiter.release(socket.id);
  }

  private removeFromRoom(socket: AppSocket): void {
    const { peerId } = socket.data;
    if (!peerId) return;
    const result = this.rooms.leaveRoom(peerId);
    socket.data.peerId = '';
    const roomId = socket.data.roomId;
    socket.data.roomId = null;
    if (!result || !roomId) return;

    void socket.leave(roomId);
    if (!result.roomClosed) {
      this.io.to(roomId).emit(SIGNAL_EVENTS.PEER_LEFT, { peerId });
    }
    this.logger.info({ roomId, peerId, roomClosed: result.roomClosed }, 'peer left');
  }

  private guard(socket: AppSocket, respond: (r: AckErr) => void): boolean {
    if (this.rateLimiter.tryConsume(socket.id)) return true;
    respond({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many signaling messages' } });
    return false;
  }

  private validate<T>(
    schema: z.ZodType<T>,
    payload: unknown,
    respond: (r: AckErr) => void,
  ): T | null {
    const result = schema.safeParse(payload);
    if (result.success) return result.data;
    respond({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Malformed payload' } });
    return null;
  }
}

type AckErr = { ok: false; error: { code: ErrorCode; message: string } };

/** Tolerates clients that emit without an ack callback. */
function safeAck<T>(ack: Ack<T> | undefined): Ack<T> {
  return typeof ack === 'function' ? ack : () => undefined;
}

function reasonMessage(reason: 'ROOM_NOT_FOUND' | 'ROOM_FULL'): string {
  return reason === 'ROOM_FULL' ? 'This room is full' : 'Room not found or expired';
}
