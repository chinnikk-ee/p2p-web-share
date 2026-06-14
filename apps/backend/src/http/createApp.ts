import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from '../config/env.js';
import type { AppLogger } from '../lib/logger.js';
import type { RoomManager } from '../signaling/RoomManager.js';
import { registerRoutes } from './routes.js';

/**
 * Builds the Express application: security headers, CORS, JSON parsing (small
 * limit — only health/config payloads), request logging, routes, and a
 * terminal error handler.
 */
export function createApp(config: AppConfig, logger: AppLogger, rooms: RoomManager): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins === '*' ? true : config.corsOrigins,
      methods: ['GET', 'POST'],
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  registerRoutes(app, config, rooms);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'unhandled HTTP error');
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });

  return app;
}
