import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { APP } from '@p2p/shared';
import { cn } from '@p2p/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('group flex items-center gap-2.5', className)} aria-label={APP.NAME}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-primary-foreground shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
        <Share2 className="size-5" />
      </span>
      <span className="text-base font-bold tracking-tight">
        WebShare<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
