import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { cn } from '@p2p/utils';

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFile, disabled = false }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label="Drag and drop a file, or click to choose"
      whileHover={disabled ? undefined : { scale: 1.005 }}
      whileTap={disabled ? undefined : { scale: 0.995 }}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors sm:p-16',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/60 hover:bg-accent/30',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <motion.span
        animate={dragging ? { y: -6 } : { y: 0 }}
        className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-hover/20 text-brand-primary"
      >
        <UploadCloud className="size-8" />
      </motion.span>
      <div className="space-y-1">
        <p className="text-lg font-semibold">
          {dragging ? 'Drop to share' : 'Drag & drop a file here'}
        </p>
        <p className="text-sm text-muted-foreground">
          or <span className="font-medium text-primary">browse</span> — any size, encrypted in your
          browser
        </p>
      </div>
    </motion.div>
  );
}
