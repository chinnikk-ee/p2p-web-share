import { Github } from 'lucide-react';
import { APP } from '@p2p/shared';
import { Button } from '@p2p/ui';
import { Logo } from './Logo';
import { ServerStatus } from './ServerStatus';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <ServerStatus />
          <Button variant="ghost" size="icon" asChild aria-label="GitHub repository">
            <a href={APP.REPO_URL} target="_blank" rel="noreferrer noopener">
              <Github className="size-5" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
