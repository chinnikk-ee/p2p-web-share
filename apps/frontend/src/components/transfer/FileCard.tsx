import { X } from 'lucide-react';
import { cn, formatBytes, truncateFilename } from '@p2p/utils';
import { Button } from '@p2p/ui';
import { FileGlyph } from '@/components/common/FileGlyph';

interface FileCardProps {
  name: string;
  size: number;
  mime: string;
  className?: string;
  onRemove?: () => void;
}

export function FileCard({ name, size, mime, className, onRemove }: FileCardProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-card/60 p-3', className)}>
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <FileGlyph name={name} mime={mime} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={name}>
          {truncateFilename(name, 42)}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatBytes(size)}
          {mime ? ` · ${mime}` : ''}
        </p>
      </div>
      {onRemove && (
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove file">
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
