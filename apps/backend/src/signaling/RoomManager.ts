import { generateRoomId, generateUuid } from './ids.js';
import type { PeerInfo, PeerRole } from '@p2p/types';

/** A connected peer. `connectionId` is the transport routing token (socket id). */
export interface PeerRecord {
  id: string;
  role: PeerRole;
  joinedAt: number;
  connectionId: string;
  label?: string;
}

export interface Room {
  id: string;
  createdAt: number;
  lastActivityAt: number;
  peers: Map<string, PeerRecord>;
}

export type JoinResult =
  | { ok: true; room: Room; peer: PeerRecord }
  | { ok: false; reason: 'ROOM_NOT_FOUND' | 'ROOM_FULL' };

export interface LeaveResult {
  roomId: string;
  removedPeerId: string;
  roomClosed: boolean;
}

/**
 * In-memory room/peer registry. Deliberately transport-agnostic (knows nothing
 * about Socket.io) so it can be unit-tested in isolation and swapped for a
 * Redis-backed implementation when scaling horizontally.
 *
 * Holds ONLY routing metadata — never any file bytes.
 */
export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly peerToRoom = new Map<string, string>();

  constructor(
    private readonly maxPeersPerRoom: number,
    private readonly now: () => number = Date.now,
  ) {}

  createRoom(connectionId: string, label?: string): { room: Room; peer: PeerRecord } {
    const roomId = this.generateUniqueRoomId();
    const timestamp = this.now();
    const peer: PeerRecord = {
      id: generateUuid(),
      role: 'host',
      joinedAt: timestamp,
      connectionId,
      ...(label ? { label } : {}),
    };
    const room: Room = {
      id: roomId,
      createdAt: timestamp,
      lastActivityAt: timestamp,
      peers: new Map([[peer.id, peer]]),
    };
    this.rooms.set(roomId, room);
    this.peerToRoom.set(peer.id, roomId);
    return { room, peer };
  }

  joinRoom(roomId: string, connectionId: string, label?: string): JoinResult {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: 'ROOM_NOT_FOUND' };
    if (room.peers.size >= this.maxPeersPerRoom) return { ok: false, reason: 'ROOM_FULL' };

    const peer: PeerRecord = {
      id: generateUuid(),
      role: 'guest',
      joinedAt: this.now(),
      connectionId,
      ...(label ? { label } : {}),
    };
    room.peers.set(peer.id, peer);
    room.lastActivityAt = this.now();
    this.peerToRoom.set(peer.id, roomId);
    return { ok: true, room, peer };
  }

  leaveRoom(peerId: string): LeaveResult | null {
    const roomId = this.peerToRoom.get(peerId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    this.peerToRoom.delete(peerId);
    if (!room) return null;

    room.peers.delete(peerId);
    room.lastActivityAt = this.now();
    const roomClosed = room.peers.size === 0;
    if (roomClosed) this.rooms.delete(roomId);

    return { roomId, removedPeerId: peerId, roomClosed };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getPeerRoomId(peerId: string): string | undefined {
    return this.peerToRoom.get(peerId);
  }

  getPeer(roomId: string, peerId: string): PeerRecord | undefined {
    return this.rooms.get(roomId)?.peers.get(peerId);
  }

  /** Public view of a room's peers, optionally excluding one peer. */
  listPeers(roomId: string, excludePeerId?: string): PeerInfo[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const peers: PeerInfo[] = [];
    for (const peer of room.peers.values()) {
      if (peer.id === excludePeerId) continue;
      peers.push(toPeerInfo(peer));
    }
    return peers;
  }

  touch(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.lastActivityAt = this.now();
  }

  /** Removes rooms idle beyond `ttlMs`. Returns the closed room ids. */
  sweepIdleRooms(ttlMs: number): string[] {
    const cutoff = this.now() - ttlMs;
    const closed: string[] = [];
    for (const [roomId, room] of this.rooms) {
      if (room.lastActivityAt < cutoff) {
        for (const peerId of room.peers.keys()) this.peerToRoom.delete(peerId);
        this.rooms.delete(roomId);
        closed.push(roomId);
      }
    }
    return closed;
  }

  stats(): { rooms: number; peers: number } {
    let peers = 0;
    for (const room of this.rooms.values()) peers += room.peers.size;
    return { rooms: this.rooms.size, peers };
  }

  private generateUniqueRoomId(): string {
    let attempts = 0;
    let id = generateRoomId();
    while (this.rooms.has(id) && attempts < 10) {
      id = generateRoomId();
      attempts += 1;
    }
    return id;
  }
}

export function toPeerInfo(peer: PeerRecord): PeerInfo {
  return {
    id: peer.id,
    role: peer.role,
    joinedAt: peer.joinedAt,
    ...(peer.label ? { label: peer.label } : {}),
  };
}
