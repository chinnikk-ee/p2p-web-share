import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@p2p/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  pulse?: boolean;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  pulse,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10 text-center', className)}>
      <span className="relative grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {pulse && (
          <span className="absolute inline-flex size-full animate-pulse-ring rounded-2xl bg-primary/20" />
        )}
        <Icon className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
