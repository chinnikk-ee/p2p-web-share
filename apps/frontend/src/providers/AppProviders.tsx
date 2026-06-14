import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@p2p/ui';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/hooks/useTheme';

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster richColors closeButton position="top-center" theme={resolved} />;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
