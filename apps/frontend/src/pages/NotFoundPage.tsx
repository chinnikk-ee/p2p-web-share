import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@p2p/ui';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-20 text-center">
      <p className="text-7xl font-extrabold text-gradient">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">
          This link may have expired, or the room no longer exists. Share links are one-time and
          rooms close when the sender disconnects.
        </p>
      </div>
      <Button asChild>
        <Link to="/">
          <Home className="size-4" /> Back home
        </Link>
      </Button>
    </div>
  );
}
