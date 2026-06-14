import { ShieldCheck } from 'lucide-react';

export function VerificationBadge({ hash }: { hash: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
      <ShieldCheck className="size-5 shrink-0 text-emerald-500" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Integrity verified — SHA-256 matches
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground" title={hash}>
          {hash}
        </p>
      </div>
    </div>
  );
}
