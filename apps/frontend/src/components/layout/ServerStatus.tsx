import { Tooltip, TooltipContent, TooltipTrigger } from '@p2p/ui';
import { cn } from '@p2p/utils';
import { useServerHealth } from '@/hooks/useServerHealth';

export function ServerStatus() {
  const { isPending, isError } = useServerHealth();
  const state = isPending ? 'pending' : isError ? 'down' : 'up';

  const dot =
    state === 'up'
      ? 'bg-emerald-500'
      : state === 'down'
        ? 'bg-destructive'
        : 'bg-amber-400';
  const label =
    state === 'up'
      ? 'Signaling server online'
      : state === 'down'
        ? 'Signaling server unreachable'
        : 'Checking signaling server…';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground sm:flex">
          <span className="relative flex size-2">
            {state === 'up' && (
              <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', dot)} />
            )}
            <span className={cn('relative inline-flex size-2 rounded-full', dot)} />
          </span>
          <span>Signaling</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
