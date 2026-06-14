/**
 * Fixed-window per-key rate limiter. Cheap and allocation-light: one counter
 * per connection, reset when its window elapses. Used to cap signaling
 * messages per socket and blunt abusive clients.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns true if the action is allowed (and records it). */
  tryConsume(key: string): boolean {
    const timestamp = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= timestamp) {
      this.buckets.set(key, { count: 1, resetAt: timestamp + this.windowMs });
      return true;
    }
    if (bucket.count >= this.max) return false;
    bucket.count += 1;
    return true;
  }

  release(key: string): void {
    this.buckets.delete(key);
  }
}
