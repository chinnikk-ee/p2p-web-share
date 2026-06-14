/**
 * Sliding-window throughput meter. Tracks both an instantaneous rate (over a
 * short window, for a responsive UI) and a cumulative average (for a stable
 * ETA). Time source is injectable for deterministic tests.
 */
export class SpeedMeter {
  private samples: { time: number; bytes: number }[] = [];
  private totalBytes = 0;
  private startedAt = 0;
  private started = false;

  constructor(
    private readonly windowMs: number,
    private readonly now: () => number = () => performance.now(),
  ) {}

  record(bytes: number): void {
    const time = this.now();
    if (!this.started) {
      this.startedAt = time;
      this.started = true;
    }
    this.totalBytes += bytes;
    this.samples.push({ time, bytes });

    const cutoff = time - this.windowMs;
    while (this.samples.length > 0 && (this.samples[0] as { time: number }).time < cutoff) {
      this.samples.shift();
    }
  }

  get total(): number {
    return this.totalBytes;
  }

  get instantBytesPerSecond(): number {
    if (this.samples.length < 2) return this.averageBytesPerSecond;
    const first = this.samples[0] as { time: number };
    const last = this.samples[this.samples.length - 1] as { time: number };
    const elapsedSeconds = (last.time - first.time) / 1000;
    if (elapsedSeconds <= 0) return this.averageBytesPerSecond;
    const windowBytes = this.samples.reduce((sum, s) => sum + s.bytes, 0);
    return windowBytes / elapsedSeconds;
  }

  get averageBytesPerSecond(): number {
    if (!this.started) return 0;
    const elapsedSeconds = (this.now() - this.startedAt) / 1000;
    return elapsedSeconds > 0 ? this.totalBytes / elapsedSeconds : 0;
  }

  etaSeconds(remainingBytes: number): number {
    const rate = this.instantBytesPerSecond || this.averageBytesPerSecond;
    if (rate <= 0) return Infinity;
    return remainingBytes / rate;
  }

  reset(): void {
    this.samples = [];
    this.totalBytes = 0;
    this.startedAt = 0;
    this.started = false;
  }
}
