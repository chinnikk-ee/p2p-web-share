import { describe, expect, it } from 'vitest';
import { computeTotalChunks, chunkRangeAt } from './chunking.js';
import { formatBytes, formatDuration, formatSpeed, truncateFilename } from './format.js';

describe('formatters', () => {
  it('formats bytes across units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
    expect(formatBytes(-1)).toBe('—');
  });

  it('formats speed', () => {
    expect(formatSpeed(0)).toBe('—');
    expect(formatSpeed(1_048_576)).toBe('1.0 MB/s');
  });

  it('formats durations', () => {
    expect(formatDuration(5)).toBe('5s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(Infinity)).toBe('—');
  });

  it('truncates filenames keeping the extension', () => {
    expect(truncateFilename('short.txt')).toBe('short.txt');
    const long = truncateFilename('a-really-really-really-long-filename.png', 20);
    expect(long.endsWith('.png')).toBe(true);
    expect(long.length).toBeLessThanOrEqual(20);
  });
});

describe('chunking', () => {
  it('computes total chunks', () => {
    expect(computeTotalChunks(0, 100)).toBe(0);
    expect(computeTotalChunks(100, 100)).toBe(1);
    expect(computeTotalChunks(101, 100)).toBe(2);
  });

  it('produces correct ranges including the final partial chunk', () => {
    expect(chunkRangeAt(0, 100, 250)).toEqual({ index: 0, start: 0, end: 100, size: 100 });
    expect(chunkRangeAt(2, 100, 250)).toEqual({ index: 2, start: 200, end: 250, size: 50 });
  });

  it('throws on invalid chunk size', () => {
    expect(() => computeTotalChunks(100, 0)).toThrow();
  });
});
