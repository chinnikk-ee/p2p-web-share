import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button } from '@p2p/ui';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Retry' }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="flex flex-col gap-3">
      <AlertTriangle />
      <div>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" className="w-fit" onClick={onRetry}>
          <RotateCcw className="size-4" /> {retryLabel}
        </Button>
      )}
    </Alert>
  );
}
