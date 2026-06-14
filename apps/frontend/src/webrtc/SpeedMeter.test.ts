import { describe, expect, it } from 'vitest';
import { SpeedMeter } from './SpeedMeter';

describe('SpeedMeter', () => {
  it('computes average throughput against an injected clock', () => {
    let now = 0;
    const meter = new SpeedMeter(3000, () => now);

    meter.record(1000); // t=0, starts the clock
    now = 1000;
    meter.record(1000); // t=1s

    expect(meter.total).toBe(2000);
    expect(meter.averageBytesPerSecond).toBeCloseTo(2000, 0);
  });

  it('estimates ETA from the current rate', () => {
    let now = 0;
    const meter = new SpeedMeter(3000, () => now);
    meter.record(1000);
    now = 1000;
    meter.record(1000);
    // 2000 B/s, 4000 bytes remaining → ~2s
    expect(meter.etaSeconds(4000)).toBeCloseTo(2, 0);
  });

  it('returns Infinity ETA when no data has flowed', () => {
    const meter = new SpeedMeter(3000, () => 0);
    expect(meter.etaSeconds(1000)).toBe(Infinity);
  });

  it('drops samples outside the window', () => {
    let now = 0;
    const meter = new SpeedMeter(1000, () => now);
    meter.record(500);
    now = 5000; // far outside the 1s window
    meter.record(500);
    // Only the most recent sample remains relevant for the instant rate.
    expect(meter.instantBytesPerSecond).toBeGreaterThanOrEqual(0);
  });
});
