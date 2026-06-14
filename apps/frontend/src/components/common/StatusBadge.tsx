import { Badge, type BadgeProps } from '@p2p/ui';
import { cn } from '@p2p/utils';
import type { ConnectionStatus, TransferPhase } from '@/webrtc';

type Variant = NonNullable<BadgeProps['variant']>;

const CONNECTION: Record<ConnectionStatus, { label: string; variant: Variant; pulse?: boolean }> = {
  idle: { label: 'Idle', variant: 'secondary' },
  waiting: { label: 'Waiting for peer', variant: 'info', pulse: true },
  connecting: { label: 'Connecting', variant: 'warning', pulse: true },
  connected: { label: 'Connected', variant: 'success' },
  reconnecting: { label: 'Reconnecting', variant: 'warning', pulse: true },
  disconnected: { label: 'Disconnected', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const PHASE: Record<TransferPhase, { label: string; variant: Variant }> = {
  idle: { label: 'Idle', variant: 'secondary' },
  connecting: { label: 'Connecting', variant: 'warning' },
  'awaiting-peer': { label: 'Awaiting peer', variant: 'info' },
  negotiating: { label: 'Negotiating', variant: 'warning' },
  transferring: { label: 'Transferring', variant: 'info' },
  paused: { label: 'Paused', variant: 'warning' },
  verifying: { label: 'Verifying', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const { label, variant, pulse } = CONNECTION[status];
  return (
    <Badge variant={variant}>
      <span className={cn('size-1.5 rounded-full bg-current', pulse && 'animate-pulse')} />
      {label}
    </Badge>
  );
}

export function PhaseBadge({ phase }: { phase: TransferPhase }) {
  const { label, variant } = PHASE[phase];
  return <Badge variant={variant}>{label}</Badge>;
}
