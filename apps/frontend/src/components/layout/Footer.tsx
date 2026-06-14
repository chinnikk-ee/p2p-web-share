import { Lock, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-500" />
          Files transfer peer-to-peer. The server never sees your data.
        </p>
        <p className="flex items-center gap-2">
          <Lock className="size-3.5" />
          End-to-end AES-256-GCM · SHA-256 verified
        </p>
      </div>
    </footer>
  );
}
