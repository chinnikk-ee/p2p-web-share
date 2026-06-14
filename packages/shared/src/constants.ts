/**
 * Centralized, documented tunables. Every magic number in the system lives
 * here with a rationale, so behaviour can be reasoned about and changed in one
 * place. All sizes are in bytes and all durations in milliseconds.
 */

const KB = 1024;
const MB = 1024 * KB;

export const SIZE = { KB, MB } as const;

/**
 * AES-GCM appends a 16-byte (128-bit) authentication tag to every encrypted
 * chunk, so the on-wire payload is always `plaintext.length + 16` bytes.
 */
export const GCM_TAG_BYTES = 16;

/**
 * The largest single message browsers reliably accept on an SCTP data channel.
 * Chrome negotiates a 256 KiB `max-message-size`; sending a larger message
 * aborts the channel. The on-wire ciphertext (plaintext + the GCM tag) must
 * never exceed this.
 */
export const MAX_DATACHANNEL_MESSAGE = 256 * KB;

/**
 * DataChannel chunk sizing. SCTP interop is safest at small message sizes, but
 * modern browsers reliably handle up to 256 KiB. We adapt within this band at
 * runtime based on measured throughput and backpressure.
 *
 * MAX is the largest *plaintext* chunk: it must leave room for the AES-GCM tag
 * so the encrypted payload still fits MAX_DATACHANNEL_MESSAGE. A bare 256 KiB
 * chunk + 16-byte tag overflows Chrome's limit and silently aborts the transfer.
 */
export const CHUNK = {
  MIN: 16 * KB,
  DEFAULT: 64 * KB,
  MAX: MAX_DATACHANNEL_MESSAGE - GCM_TAG_BYTES,
} as const;

/**
 * Static starting chunk size as a function of file size. The runtime
 * ChunkScheduler then nudges this up/down based on observed RTT/throughput.
 */
export function initialChunkSize(fileSize: number): number {
  if (fileSize <= 4 * MB) return CHUNK.MIN;
  if (fileSize <= 128 * MB) return CHUNK.DEFAULT;
  return CHUNK.MAX;
}

/**
 * Above this size we must not buffer the whole file in memory on the receiver;
 * the storage layer switches from an in-memory store to OPFS/IndexedDB.
 */
export const STORAGE = {
  /** Receiver keeps files at or below this fully in RAM. */
  MEMORY_MAX: 64 * MB,
  /** IndexedDB value size stays modest to avoid per-record overhead. */
  IDB_BLOCK_SIZE: 4 * MB,
} as const;

/**
 * Backpressure thresholds for `RTCDataChannel.bufferedAmount`. We stop pushing
 * when the send buffer exceeds HIGH and resume once it drains below LOW.
 */
export const BACKPRESSURE = {
  HIGH_WATER: 8 * MB,
  LOW_WATER: 1 * MB,
} as const;

/** Connection / negotiation timeouts and recovery cadence. */
export const TIMING = {
  CONNECTION_TIMEOUT_MS: 30_000,
  ICE_RESTART_DELAY_MS: 2_000,
  ICE_RESTART_MAX_ATTEMPTS: 5,
  RECONNECT_BACKOFF_BASE_MS: 1_000,
  RECONNECT_BACKOFF_MAX_MS: 15_000,
  SPEED_SAMPLE_WINDOW_MS: 3_000,
  STATS_INTERVAL_MS: 500,
} as const;

/** Room / peer limits. Mesh mode allows multiple guests to swarm a file. */
export const LIMITS = {
  MAX_PEERS_PER_ROOM: 8,
  /** Soft reference from the brief; we support far larger via streamed storage. */
  MVP_FILE_SIZE_HINT: 50 * MB,
} as const;

/** Reliable, ordered DataChannel configuration. */
export const DATACHANNEL_LABEL = 'p2p-file-transfer';
export const DATACHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true,
  // maxRetransmits omitted => fully reliable (TCP-like) delivery.
};
