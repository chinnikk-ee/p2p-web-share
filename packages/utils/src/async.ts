/** Small async helpers shared by the engine and hooks. */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff delay, capped, used for reconnect/ICE-restart loops. */
export function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
  const exp = baseMs * 2 ** Math.max(0, attempt);
  return Math.min(exp, maxMs);
}

/** Resolve when `predicate()` is true, polling at `intervalMs`, or reject on timeout. */
export async function waitFor(
  predicate: () => boolean,
  { timeoutMs, intervalMs = 50 }: { timeoutMs: number; intervalMs?: number },
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor: timed out');
    }
    await sleep(intervalMs);
  }
}
