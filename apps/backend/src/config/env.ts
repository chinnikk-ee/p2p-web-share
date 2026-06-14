import 'dotenv/config';
import { z } from 'zod';

/** Splits a comma-separated env var into a trimmed, non-empty array. */
const csv = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  ROOM_TTL_MS: z.coerce.number().int().positive().default(900_000),
  ROOM_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  MAX_PEERS_PER_ROOM: z.coerce.number().int().positive().default(8),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(25_000),
  HEARTBEAT_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  STUN_URLS: z.string().default('stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302'),
  TURN_URL: z.string().default(''),
  TURN_USERNAME: z.string().default(''),
  TURN_CREDENTIAL: z.string().default(''),
});

export type RawEnv = z.infer<typeof rawEnvSchema>;

export interface AppConfig {
  nodeEnv: RawEnv['NODE_ENV'];
  isProduction: boolean;
  host: string;
  port: number;
  corsOrigins: string[] | '*';
  rateLimit: { max: number; windowMs: number };
  room: { ttlMs: number; sweepIntervalMs: number; maxPeers: number };
  heartbeat: { intervalMs: number; timeoutMs: number };
  logLevel: RawEnv['LOG_LEVEL'];
  ice: {
    stunUrls: string[];
    turn?: { url: string; username: string; credential: string };
  };
}

/**
 * Parses and validates `process.env` into a typed, derived config. Fails fast
 * with a readable message if anything is invalid — no half-configured server.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = rawEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const e = parsed.data;
  const corsOrigins = e.CORS_ORIGIN.trim() === '*' ? '*' : csv(e.CORS_ORIGIN);
  const turn =
    e.TURN_URL && e.TURN_USERNAME && e.TURN_CREDENTIAL
      ? { url: e.TURN_URL, username: e.TURN_USERNAME, credential: e.TURN_CREDENTIAL }
      : undefined;

  return {
    nodeEnv: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    host: e.HOST,
    port: e.PORT,
    corsOrigins,
    rateLimit: { max: e.RATE_LIMIT_MAX, windowMs: e.RATE_LIMIT_WINDOW_MS },
    room: {
      ttlMs: e.ROOM_TTL_MS,
      sweepIntervalMs: e.ROOM_SWEEP_INTERVAL_MS,
      maxPeers: e.MAX_PEERS_PER_ROOM,
    },
    heartbeat: { intervalMs: e.HEARTBEAT_INTERVAL_MS, timeoutMs: e.HEARTBEAT_TIMEOUT_MS },
    logLevel: e.LOG_LEVEL,
    ice: { stunUrls: csv(e.STUN_URLS), ...(turn ? { turn } : {}) },
  };
}
