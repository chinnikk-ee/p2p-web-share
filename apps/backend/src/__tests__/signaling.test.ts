import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { SIGNAL_EVENTS } from '@p2p/types';
import { createLogger } from '../lib/logger.js';
import { createSignalingServer, type SignalingServer } from '../server.js';
import type { AppConfig } from '../config/env.js';

const testConfig: AppConfig = {
  nodeEnv: 'test',
  isProduction: false,
  host: '127.0.0.1',
  port: 0,
  corsOrigins: '*',
  rateLimit: { max: 1000, windowMs: 1000 },
  room: { ttlMs: 1_000_000, sweepIntervalMs: 1_000_000, maxPeers: 4 },
  heartbeat: { intervalMs: 25_000, timeoutMs: 60_000 },
  logLevel: 'silent',
  ice: { stunUrls: ['stun:stun.l.google.com:19302'] },
};

let server: SignalingServer;
let url: string;

beforeAll(async () => {
  server = createSignalingServer(testConfig, createLogger('silent', false));
  await server.listen();
  const { port } = server.httpServer.address() as AddressInfo;
  url = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await server.close();
});

function connect(): Promise<Socket> {
  const socket = io(url, { transports: ['websocket'], forceNew: true });
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, (payload: T) => resolve(payload)));
}

describe('SignalingGateway', () => {
  it('creates a room and returns ids', async () => {
    const a = await connect();
    const ack = await a.emitWithAck(SIGNAL_EVENTS.CREATE_ROOM, {});
    expect(ack.ok).toBe(true);
    expect(ack.data.roomId).toMatch(/^[A-Za-z0-9_-]{16}$/);
    a.disconnect();
  });

  it('lets a second peer join and notifies the host', async () => {
    const host = await connect();
    const created = await host.emitWithAck(SIGNAL_EVENTS.CREATE_ROOM, { label: 'Host' });
    const peerJoined = once<{ peer: { id: string } }>(host, SIGNAL_EVENTS.PEER_JOINED);

    const guest = await connect();
    const joined = await guest.emitWithAck(SIGNAL_EVENTS.JOIN_ROOM, {
      roomId: created.data.roomId,
    });
    expect(joined.ok).toBe(true);
    expect(joined.data.peers).toHaveLength(1);
    expect(joined.data.peers[0].id).toBe(created.data.peerId);

    const event = await peerJoined;
    expect(event.peer.id).toBe(joined.data.peerId);

    host.disconnect();
    guest.disconnect();
  });

  it('relays a signal to the targeted peer only', async () => {
    const host = await connect();
    const created = await host.emitWithAck(SIGNAL_EVENTS.CREATE_ROOM, {});
    const guest = await connect();
    const joined = await guest.emitWithAck(SIGNAL_EVENTS.JOIN_ROOM, {
      roomId: created.data.roomId,
    });

    const incoming = once<{ from: string; signal: { type: string } }>(
      guest,
      SIGNAL_EVENTS.INCOMING_SIGNAL,
    );
    const relayAck = await host.emitWithAck(SIGNAL_EVENTS.RELAY_SIGNAL, {
      to: joined.data.peerId,
      signal: { type: 'offer', sdp: 'v=0 test' },
    });
    expect(relayAck).toEqual({ ok: true, data: { delivered: true } });

    const received = await incoming;
    expect(received.from).toBe(created.data.peerId);
    expect(received.signal.type).toBe('offer');

    host.disconnect();
    guest.disconnect();
  });

  it('rejects joining an unknown room', async () => {
    const a = await connect();
    const ack = await a.emitWithAck(SIGNAL_EVENTS.JOIN_ROOM, { roomId: 'doesnotexist' });
    expect(ack.ok).toBe(false);
    expect(ack.error.code).toBe('ROOM_NOT_FOUND');
    a.disconnect();
  });

  it('rejects malformed payloads', async () => {
    const a = await connect();
    const ack = await a.emitWithAck(SIGNAL_EVENTS.JOIN_ROOM, { roomId: 12345 });
    expect(ack.ok).toBe(false);
    expect(ack.error.code).toBe('INVALID_PAYLOAD');
    a.disconnect();
  });

  it('notifies remaining peers when one disconnects', async () => {
    const host = await connect();
    const created = await host.emitWithAck(SIGNAL_EVENTS.CREATE_ROOM, {});
    const guest = await connect();
    const joined = await guest.emitWithAck(SIGNAL_EVENTS.JOIN_ROOM, {
      roomId: created.data.roomId,
    });

    const peerLeft = once<{ peerId: string }>(host, SIGNAL_EVENTS.PEER_LEFT);
    guest.disconnect();
    const event = await peerLeft;
    expect(event.peerId).toBe(joined.data.peerId);

    host.disconnect();
  });
});
