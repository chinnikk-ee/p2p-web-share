import { describe, expect, it } from 'vitest';
import { RoomManager } from './RoomManager.js';

describe('RoomManager', () => {
  it('creates a room with a host peer', () => {
    const rm = new RoomManager(4);
    const { room, peer } = rm.createRoom('conn-1', 'Alice');
    expect(room.id).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(peer.role).toBe('host');
    expect(peer.label).toBe('Alice');
    expect(rm.getPeerRoomId(peer.id)).toBe(room.id);
  });

  it('lets guests join and lists peers excluding self', () => {
    const rm = new RoomManager(4);
    const { room, peer: host } = rm.createRoom('conn-1');
    const result = rm.joinRoom(room.id, 'conn-2');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.peer.role).toBe('guest');
    expect(rm.listPeers(room.id, result.peer.id).map((p) => p.id)).toEqual([host.id]);
  });

  it('rejects joins to unknown rooms', () => {
    const rm = new RoomManager(4);
    expect(rm.joinRoom('nope', 'conn-2')).toEqual({ ok: false, reason: 'ROOM_NOT_FOUND' });
  });

  it('enforces the room capacity', () => {
    const rm = new RoomManager(2);
    const { room } = rm.createRoom('conn-1');
    expect(rm.joinRoom(room.id, 'conn-2').ok).toBe(true);
    expect(rm.joinRoom(room.id, 'conn-3')).toEqual({ ok: false, reason: 'ROOM_FULL' });
  });

  it('closes a room when its last peer leaves', () => {
    const rm = new RoomManager(4);
    const { room, peer } = rm.createRoom('conn-1');
    const result = rm.leaveRoom(peer.id);
    expect(result).toEqual({ roomId: room.id, removedPeerId: peer.id, roomClosed: true });
    expect(rm.getRoom(room.id)).toBeUndefined();
  });

  it('sweeps idle rooms past their TTL', () => {
    let now = 1_000;
    const rm = new RoomManager(4, () => now);
    const { room } = rm.createRoom('conn-1');
    now = 1_000 + 10_000;
    expect(rm.sweepIdleRooms(5_000)).toEqual([room.id]);
    expect(rm.stats()).toEqual({ rooms: 0, peers: 0 });
  });
});
