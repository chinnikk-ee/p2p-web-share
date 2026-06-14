import { Lock, ShieldCheck, Wifi } from 'lucide-react';
import { Badge } from '@p2p/ui';

export function SecurityBadges({ encrypted }: { encrypted: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {encrypted && (
        <Badge variant="success">
          <Lock className="size-3" /> AES-256-GCM
        </Badge>
      )}
      <Badge variant="info">
        <ShieldCheck className="size-3" /> SHA-256 verified
      </Badge>
      <Badge variant="secondary">
        <Wifi className="size-3" /> Peer-to-peer
      </Badge>
    </div>
  );
}
