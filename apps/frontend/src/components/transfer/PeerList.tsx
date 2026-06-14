import { CheckCircle2, Users } from 'lucide-react';
import { Progress } from '@p2p/ui';
import { formatBytes, formatSpeed } from '@p2p/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { PhaseBadge } from '@/components/common/StatusBadge';
import type { SenderPeerView } from '@/hooks/useSenderSession';

export function PeerList({ peers }: { peers: SenderPeerView[] }) {
  if (peers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        pulse
        title="Waiting for someone to join"
        description="Send the link above. The transfer starts automatically the moment they open it."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {peers.map((peer, index) => {
        const pct = Math.round(peer.stats.percent * 100);
        const complete = peer.phase === 'completed';
        return (
          <li key={peer.peerId} className="space-y-2 rounded-xl border bg-card/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium">
                {complete ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <Users className="size-4 text-primary" />
                )}
                Receiver #{index + 1}
              </span>
              <PhaseBadge phase={peer.phase} />
            </div>
            <Progress value={pct} />
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>
                {formatBytes(peer.stats.transferredBytes)} / {formatBytes(peer.stats.totalBytes)}
              </span>
              <span>
                {pct}% · {formatSpeed(peer.stats.bytesPerSecond)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
