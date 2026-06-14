import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@p2p/ui';
import { useClipboard } from '@/hooks/useClipboard';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'value'> {
  value: string;
  label?: string;
}

export function CopyButton({
  value,
  label = 'Copy',
  variant = 'secondary',
  ...rest
}: CopyButtonProps) {
  const { copied, copy } = useClipboard();

  return (
    <Button
      variant={variant}
      onClick={() => {
        void copy(value).then((ok) =>
          ok ? toast.success('Copied to clipboard') : toast.error('Could not copy'),
        );
      }}
      {...rest}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}
