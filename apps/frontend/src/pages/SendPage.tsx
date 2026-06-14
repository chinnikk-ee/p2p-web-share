import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@p2p/ui';
import { ConnectionBadge } from '@/components/common/StatusBadge';
import { ErrorState } from '@/components/common/ErrorState';
import { FileCard } from '@/components/transfer/FileCard';
import { PeerList } from '@/components/transfer/PeerList';
import { SecurityBadges } from '@/components/transfer/SecurityBadges';
import { ShareLinkCard } from '@/components/transfer/ShareLinkCard';
import { useSenderSession } from '@/hooks/useSenderSession';

interface SendPageProps {
  file: File;
  onReset: () => void;
}

export function SendPage({ file, onReset }: SendPageProps) {
  const sender = useSenderSession();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void sender.start(file, true);
    // `sender` is stable enough for a one-shot start; remount via key on new file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const completedCount = sender.peers.filter((p) => p.phase === 'completed').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl"
    >
      <Card className="glass-strong overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl">Ready to share</CardTitle>
            <CardDescription>
              {completedCount > 0
                ? `${completedCount} download${completedCount > 1 ? 's' : ''} completed`
                : 'Your file stays in this browser until a recipient connects.'}
            </CardDescription>
          </div>
          <ConnectionBadge status={sender.status} />
        </CardHeader>

        <CardContent className="space-y-5">
          <FileCard
            name={file.name}
            size={file.size}
            mime={file.type || 'application/octet-stream'}
            onRemove={() => {
              sender.cancel();
              onReset();
            }}
          />

          <SecurityBadges encrypted />

          {sender.error ? (
            <ErrorState
              title="Could not start sharing"
              message={sender.error}
              onRetry={() => void sender.start(file, true)}
            />
          ) : sender.shareUrl ? (
            <ShareLinkCard shareUrl={sender.shareUrl} encrypted />
          ) : (
            <div className="flex items-center gap-2 rounded-xl border bg-card/50 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Creating a secure room…
            </div>
          )}

          <Separator />

          <div>
            <h3 className="mb-3 text-sm font-semibold">Recipients</h3>
            <PeerList peers={sender.peers} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Keep this tab open — closing it ends the transfer.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sender.cancel();
                onReset();
              }}
            >
              <RefreshCw className="size-4" /> Share a different file
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
