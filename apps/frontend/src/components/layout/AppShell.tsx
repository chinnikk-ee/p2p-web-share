import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Decorative aurora background */}
      <div className="bg-aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,transparent_40%,hsl(var(--background)))]"
        aria-hidden
      />
      <Header />
      <main className="container flex-1 py-10 md:py-16">{children}</main>
      <Footer />
    </div>
  );
}
