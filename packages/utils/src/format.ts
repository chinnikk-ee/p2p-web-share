/** Human-friendly formatters for the transfer UI. */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), BYTE_UNITS.length - 1);
  const value = bytes / k ** i;
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${BYTE_UNITS[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '—';
  return `${formatBytes(bytesPerSecond)}/s`;
}

/** Seconds → compact duration, used for ETA. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatPercent(fraction: number, decimals = 0): string {
  if (!Number.isFinite(fraction)) return '0%';
  return `${(clamp(fraction, 0, 1) * 100).toFixed(decimals)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Truncate a long filename keeping the extension visible. */
export function truncateFilename(name: string, max = 32): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot < name.length - 8) {
    return `${name.slice(0, max - 1)}…`;
  }
  const ext = name.slice(dot);
  const base = name.slice(0, max - ext.length - 1);
  return `${base}…${ext}`;
}
