import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileManifest } from '@p2p/types';
import { env } from '@/config/env';
import {
  EMPTY_STATS,
  ReceiverSession,
  triggerDownload,
  type ConnectionStatus,
  type TransferPhase,
  type TransferStats,
} from '@/webrtc';

export interface UseReceiverSession {
  status: ConnectionStatus;
  manifest: FileManifest | null;
  stats: TransferStats;
  phase: TransferPhase;
  error: string | null;
  done: { name: string; fileHash: string } | null;
  lastBlob: Blob | null;
  retry: () => Promise<void>;
  saveAgain: () => void;
}

/** React binding for {@link ReceiverSession}. Auto-downloads on completion. */
export function useReceiverSession(roomId: string, keyString?: string): UseReceiverSession {
  const sessionRef = useRef<ReceiverSession | null>(null);
  const startedRef = useRef(false);
  const blobRef = useRef<Blob | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [manifest, setManifest] = useState<FileManifest | null>(null);
  const [stats, setStats] = useState<TransferStats>(EMPTY_STATS);
  const [phase, setPhase] = useState<TransferPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; fileHash: string } | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);

  const start = useCallback(async () => {
    setError(null);
    setDone(null);
    if (sessionRef.current) {
      await sessionRef.current.dispose();
      sessionRef.current = null;
    }

    const session = new ReceiverSession(roomId, {
      signalingUrl: env.signalingUrl,
      ...(keyString ? { keyString } : {}),
    });
    sessionRef.current = session;

    session.on('connection', setStatus);
    session.on('manifest', setManifest);
    session.on('progress', ({ stats: next, phase: nextPhase }) => {
      if (next.totalBytes > 0) setStats(next);
      setPhase(nextPhase);
    });
    session.on('done', ({ blob, name, fileHash }) => {
      blobRef.current = blob;
      setLastBlob(blob);
      triggerDownload(blob, name); // auto-download on successful verification
      setDone({ name, fileHash });
      setPhase('completed');
      setStatus('connected');
    });
    session.on('failed', (err) => {
      setError(err.message);
      setPhase('failed');
    });

    await session.start();
  }, [roomId, keyString]);

  const retry = useCallback(async () => {
    setError(null);
    setPhase('connecting');
    if (!sessionRef.current) {
      await start();
      return;
    }
    await sessionRef.current.retry();
  }, [start]);

  const saveAgain = useCallback(() => {
    if (blobRef.current && manifest) triggerDownload(blobRef.current, manifest.name);
  }, [manifest]);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      void start();
    }
    return () => {
      void sessionRef.current?.dispose();
    };
  }, [start]);

  return { status, manifest, stats, phase, error, done, lastBlob, retry, saveAgain };
}
