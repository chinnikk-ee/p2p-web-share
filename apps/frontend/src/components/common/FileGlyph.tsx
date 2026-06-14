import {
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileText,
  FileVideo,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@p2p/utils';

function pickIcon(name: string, mime: string): LucideIcon {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('audio/')) return FileAudio;
  if (['zip', 'rar', '7z', 'gz', 'tar', 'bz2'].includes(ext)) return FileArchive;
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'java'].includes(ext))
    return FileCode;
  if (['txt', 'md', 'pdf', 'doc', 'docx', 'rtf'].includes(ext)) return FileText;
  return FileIcon;
}

export function FileGlyph({
  name,
  mime,
  className,
}: {
  name: string;
  mime: string;
  className?: string;
}) {
  const Icon = pickIcon(name, mime);
  return <Icon className={cn('size-6', className)} aria-hidden />;
}
