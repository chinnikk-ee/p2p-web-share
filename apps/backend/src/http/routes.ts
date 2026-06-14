import { type Express, type Request, type Response } from 'express';
import type { AppConfig } from '../config/env.js';
import type { RoomManager } from '../signaling/RoomManager.js';

interface IceServerResponse {
  urls: string | string[];
  username?: string;
  credential?: string;
}

function buildIceServers(config: AppConfig): IceServerResponse[] {
  const servers: IceServerResponse[] = [];
  if (config.ice.stunUrls.length > 0) servers.push({ urls: config.ice.stunUrls });
  if (config.ice.turn) {
    servers.push({
      urls: config.ice.turn.url,
      username: config.ice.turn.username,
      credential: config.ice.turn.credential,
    });
  }
  return servers;
}

/**
 * Mounts the small REST surface used for health checks and ICE bootstrapping.
 * The browser fetches `/ice-config` so TURN credentials live on the server, not
 * baked into the client bundle.
 */
export function registerRoutes(app: Express, config: AppConfig, rooms: RoomManager): void {
  const startedAt = Date.now();

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()), startedAt });
  });

  app.get('/ice-config', (_req: Request, res: Response) => {
    res.json({ iceServers: buildIceServers(config) });
  });

  app.get('/stats', (_req: Request, res: Response) => {
    res.json(rooms.stats());
  });

  app.get('/', (_req: Request, res: Response) => {
    res.json({ name: 'p2p-signaling', status: 'ok', docs: '/health, /ice-config, /stats' });
  });
}
