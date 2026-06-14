import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '@/lib/api';

/** Polls the signaling server health endpoint to drive the status indicator. */
export function useServerHealth() {
  return useQuery({
    queryKey: ['server-health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
    retry: 1,
  });
}
