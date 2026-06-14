import type { TransferPhase } from '@p2p/types';
import type { StorageKind } from './storage/types.js';

export interface TransferStats {
  totalBytes: number;
  transferredBytes: number;
  /** 0..1 */
  percent: number;
  bytesPerSecond: number;
  averageBytesPerSecond: number;
  etaSeconds: number;
  currentChunk: number;
  totalChunks: number;
}

export const EMPTY_STATS: TransferStats = {
  totalBytes: 0,
  transferredBytes: 0,
  percent: 0,
  bytesPerSecond: 0,
  averageBytesPerSecond: 0,
  etaSeconds: Infinity,
  currentChunk: 0,
  totalChunks: 0,
};

export type ConnectionStatus =
  | 'idle'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface FileMeta {
  name: string;
  size: number;
  mime: string;
}

export interface VerificationResult {
  ok: boolean;
  fileHash: string;
}

export type { TransferPhase, StorageKind };
