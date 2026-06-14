import { DEFAULT_STUN_URLS } from '@p2p/shared';

/** Parsed, validated client configuration derived from Vite env vars. */
export interface ClientEnv {
  signalingUrl: string;
  stunUrls: string[];
  turn?: { url: string; username: string; credential: string };
}

function csv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : fallback;
}

function readEnv(): ClientEnv {
  const signalingUrl = import.meta.env.VITE_SIGNALING_URL?.trim() || 'http://localhost:4000';
  const stunUrls = csv(import.meta.env.VITE_STUN_URLS, [...DEFAULT_STUN_URLS]);

  const turnUrl = import.meta.env.VITE_TURN_URL?.trim();
  const turnUser = import.meta.env.VITE_TURN_USERNAME?.trim();
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL?.trim();
  const turn =
    turnUrl && turnUser && turnCred
      ? { url: turnUrl, username: turnUser, credential: turnCred }
      : undefined;

  return { signalingUrl, stunUrls, ...(turn ? { turn } : {}) };
}

export const env: ClientEnv = readEnv();
