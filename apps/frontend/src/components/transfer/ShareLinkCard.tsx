import { Link2, Lock } from 'lucide-react';
import { Input } from '@p2p/ui';
import { CopyButton } from '@/components/common/CopyButton';

interface ShareLinkCardProps {
  shareUrl: string;
  encrypted: boolean;
}

export function ShareLinkCard({ shareUrl, encrypted }: ShareLinkCardProps) {
  return (
    <div className="space-y-3 rounded-xl border bg-card/50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="size-4 text-primary" />
        Share this link with the recipient
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <CopyButton value={shareUrl} label="Copy link" className="shrink-0" />
      </div>
      {encrypted && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
          The decryption key lives in the link fragment (<code className="font-mono">#k=…</code>) and
          is never sent to the server. Anyone with this link can download the file.
        </p>
      )}
    </div>
  );
}
