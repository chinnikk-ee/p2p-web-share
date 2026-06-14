import { Gauge, HardDrive, Layers, Timer, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatBytes, formatDuration, formatSpeed } from '@p2p/utils';
import type { TransferStats } from '@/webrtc';

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-base font-semibold tabular-nums" title={value}>
        {value}
      </p>
    </div>
  );
}

export function StatsGrid({ stats }: { stats: TransferStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat icon={Gauge} label="Speed" value={formatSpeed(stats.bytesPerSecond)} />
      <Stat icon={TrendingUp} label="Average" value={formatSpeed(stats.averageBytesPerSecond)} />
      <Stat icon={Timer} label="ETA" value={formatDuration(stats.etaSeconds)} />
      <Stat
        icon={HardDrive}
        label="Transferred"
        value={`${formatBytes(stats.transferredBytes)} / ${formatBytes(stats.totalBytes)}`}
      />
      <Stat
        icon={Layers}
        label="Chunks"
        value={`${stats.currentChunk} / ${stats.totalChunks}`}
      />
      <Stat icon={Gauge} label="Complete" value={`${Math.round(stats.percent * 100)}%`} />
    </div>
  );
}
