import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from '@p2p/ui';
import { ConnectionBadge, PhaseBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FileCard } from '@/components/transfer/FileCard';
import { ProgressMeter } from '@/components/transfer/ProgressMeter';
import { SecurityBadges } from '@/components/transfer/SecurityBadges';
import { StatsGrid } from '@/components/transfer/StatsGrid';
import { VerificationBadge } from '@/components/transfer/VerificationBadge';
import { useReceiverSession } from '@/hooks/useReceiverSession';

function readKeyFromHash(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hash = window.location.hash.replace(/^#/, '');
  const value = new URLSearchParams(hash).get('k');
  return value ?? undefined;
}

export function RoomPage() {
  const { roomId = '' } = useParams();
  const keyString = useMemo(() => readKeyFromHash(), []);
  const receiver = useReceiverSession(roomId, keyString);

  const { manifest, phase, stats, done, error, status } = receiver;
  const active = phase === 'transferring' || phase === 'verifying' || phase === 'paused';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl"
    >
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/">
          <ArrowLeft className="size-4" /> Home
        </Link>
      </Button>

      <Card className="glass-strong">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl">
              {done ? 'Download complete' : 'Incoming file'}
            </CardTitle>
            <CardDescription>Room {roomId}</CardDescription>
          </div>
          <ConnectionBadge status={status} />
        </CardHeader>

        <CardContent className="space-y-5">
          {manifest ? (
            <FileCard name={manifest.name} size={manifest.size} mime={manifest.mime} />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border bg-card/50 p-3">
              <Skeleton className="size-11 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          )}

          {manifest && <SecurityBadges encrypted={manifest.encrypted} />}

          {error ? (
            <ErrorState
              title="Transfer interrupted"
              message={error}
              onRetry={() => void receiver.retry()}
              retryLabel="Reconnect & resume"
            />
          ) : done ? (
            <div className="space-y-4">
              <VerificationBadge hash={done.fileHash} />
              <div className="flex flex-col gap-2 rounded-xl border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Saved to your downloads automatically.
                </p>
                <Button variant="secondary" size="sm" onClick={receiver.saveAgain}>
                  <Download className="size-4" /> Save again
                </Button>
              </div>
            </div>
          ) : active ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <PhaseBadge phase={phase} />
              </div>
              <ProgressMeter percent={stats.percent} label="Downloading" />
              <StatsGrid stats={stats} />
            </div>
          ) : (
            <EmptyState
              icon={Loader2}
              pulse
              title="Connecting to the sender"
              description="Establishing a direct, encrypted peer-to-peer channel. Keep this tab open."
            />
          )}

          <Separator />
          <p className="text-center text-xs text-muted-foreground">
            This file is transferred directly from the sender's browser. Nothing is uploaded to a
            server.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
