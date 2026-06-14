import { createServer, type Server as HttpServer } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@p2p/types';
import { SIGNAL_EVENTS } from '@p2p/types';
import type { AppConfig } from './config/env.js';
import type { AppLogger } from './lib/logger.js';
import { createApp } from './http/createApp.js';
import { RoomManager } from './signaling/RoomManager.js';
import { RateLimiter } from './signaling/RateLimiter.js';
import { SignalingGateway, type AppServer } from './signaling/SignalingGateway.js';

export interface SignalingServer {
  httpServer: HttpServer;
  io: AppServer;
  rooms: RoomManager;
  listen: () => Promise<{ host: string; port: number }>;
  close: () => Promise<void>;
}

/**
 * Composition root. Wires the HTTP app, Socket.io server, room registry, rate
 * limiter, and signaling gateway together, and schedules idle-room cleanup.
 * Returned as an object so tests can spin up an ephemeral instance and close it.
 */
export function createSignalingServer(config: AppConfig, logger: AppLogger): SignalingServer {
  const rooms = new RoomManager(config.room.maxPeers);
  const app = createApp(config, logger, rooms);
  const httpServer = createServer(app);

  const io = new SocketIoServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: config.corsOrigins === '*' ? true : config.corsOrigins,
      methods: ['GET', 'POST'],
    },
    pingInterval: config.heartbeat.intervalMs,
    pingTimeout: config.heartbeat.timeoutMs,
    // Signaling payloads are tiny; cap to reject oversized/abusive frames.
    maxHttpBufferSize: 1_000_000,
  });

  const rateLimiter = new RateLimiter(config.rateLimit.max, config.rateLimit.windowMs);
  new SignalingGateway(io, rooms, rateLimiter, logger).register();

  let sweepTimer: NodeJS.Timeout | undefined;

  return {
    httpServer,
    io,
    rooms,
    listen() {
      return new Promise((resolve) => {
        httpServer.listen(config.port, config.host, () => {
          sweepTimer = setInterval(() => {
            const closed = rooms.sweepIdleRooms(config.room.ttlMs);
            for (const roomId of closed) {
              io.to(roomId).emit(SIGNAL_EVENTS.ROOM_CLOSED, { roomId, reason: 'expired' });
            }
            if (closed.length > 0) {
              logger.info({ closed: closed.length }, 'swept idle rooms');
            }
          }, config.room.sweepIntervalMs);
          sweepTimer.unref();
          resolve({ host: config.host, port: config.port });
        });
      });
    },
    async close() {
      if (sweepTimer) clearInterval(sweepTimer);
      // io.close() also closes the attached HTTP server; only close it
      // separately if Socket.io left it listening.
      await new Promise<void>((resolve, reject) => {
        void io.close((err) => (err ? reject(err) : resolve()));
      });
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((err) => (err ? reject(err) : resolve()));
        });
      }
    },
  };
}
