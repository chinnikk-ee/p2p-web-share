import { pino, type Logger } from 'pino';

export type AppLogger = Logger;

/**
 * Creates the root logger. In non-production we pretty-print via the
 * `pino-pretty` transport; in production we emit structured JSON for ingestion.
 */
export function createLogger(level: string, pretty: boolean): AppLogger {
  return pino({
    level,
    base: { service: 'p2p-signaling' },
    transport: pretty
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
        }
      : undefined,
  });
}
