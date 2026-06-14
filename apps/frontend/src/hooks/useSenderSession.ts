import { useCallback, useEffect, useRef, useState } from 'react';
import { env } from '@/config/env';
import {
  EMPTY_STATS,
  SenderSession,
  type ConnectionStatus,
  type TransferPhase,
  type TransferStats,
} from '@/webrtc';

export interface SenderPeerView {
  peerId: string;
  stats: TransferStats;
  phase: TransferPhase;
  status: ConnectionStatus;
}

export interface UseSenderSession {
  status: ConnectionStatus;
  roomId: string | null;
  shareUrl: string | null;
  peers: SenderPeerView[];
  error: string | null;
  isStarting: boolean;
  start: (file: File, encrypt: boolean) => Promise<void>;
  cancel: () => void;
  reset: () => Promise<void>;
}

/** React binding for {@link SenderSession}: owns lifecycle + derived UI state. */
export function useSenderSession(): UseSenderSession {
  const sessionRef = useRef<SenderSession | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, SenderPeerView>>({});
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const start = useCallback(async (file: File, encrypt: boolean) => {
    setError(null);
    setIsStarting(true);
    setPeers({});
    if (sessionRef.current) {
      await sessionRef.current.dispose();
      sessionRef.current = null;
    }

    const session = new SenderSession(file, { encrypt, signalingUrl: env.signalingUrl });
    sessionRef.current = session;

    session.on('room-ready', ({ roomId: id, shareUrl: url }) => {
      setRoomId(id);
      setShareUrl(url);
    });
    session.on('connection', setStatus);
    session.on('peer-added', ({ peerId }) =>
      setPeers((prev) => ({
        ...prev,
        [peerId]: { peerId, stats: EMPTY_STATS, phase: 'connecting', status: 'connecting' },
      })),
    );
    session.on('peer-progress', ({ peerId, stats, phase }) =>
      setPeers((prev) => {
        const previous = prev[peerId];
        return {
          ...prev,
          [peerId]: {
            peerId,
            stats: stats.totalBytes > 0 ? stats : (previous?.stats ?? stats),
            phase,
            status: previous?.status ?? 'connected',
          },
        };
      }),
    );
    session.on('peer-done', ({ peerId }) =>
      setPeers((prev) =>
        prev[peerId]
          ? { ...prev, [peerId]: { ...prev[peerId], phase: 'completed', status: 'connected' } }
          : prev,
      ),
    );
    session.on('peer-failed', ({ peerId }) =>
      setPeers((prev) =>
        prev[peerId]
          ? { ...prev, [peerId]: { ...prev[peerId], phase: 'failed', status: 'failed' } }
          : prev,
      ),
    );
    session.on('peer-left', ({ peerId }) =>
      setPeers((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      }),
    );
    session.on('error', (err) => setError(err.message));

    try {
      await session.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start the session');
      setStatus('failed');
    } finally {
      setIsStarting(false);
    }
  }, []);

  const cancel = useCallback(() => {
    sessionRef.current?.cancel();
  }, []);

  const reset = useCallback(async () => {
    await sessionRef.current?.dispose();
    sessionRef.current = null;
    setStatus('idle');
    setRoomId(null);
    setShareUrl(null);
    setPeers({});
    setError(null);
  }, []);

  useEffect(
    () => () => {
      void sessionRef.current?.dispose();
    },
    [],
  );

  return {
    status,
    roomId,
    shareUrl,
    peers: Object.values(peers),
    error,
    isStarting,
    start,
    cancel,
    reset,
  };
}
