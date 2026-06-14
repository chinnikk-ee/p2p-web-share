import { Loader2 } from 'lucide-react';
import { cn } from '@p2p/utils';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2 className={cn('size-4 animate-spin text-muted-foreground', className)} />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </span>
  );
}
