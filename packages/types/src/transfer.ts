import { z } from 'zod';

/**
 * Application-level protocol carried over the WebRTC DataChannel. Control
 * frames are JSON strings; payload chunks are raw binary `ArrayBuffer`s sent
 * immediately after their `chunk` control frame (the channel is reliable +
 * ordered, so the pairing is unambiguous).
 *
 * NONE of this ever reaches the signaling server — it lives purely on the
 * encrypted peer-to-peer DataChannel.
 */

export const HASH_ALGORITHM = 'SHA-256' as const;
export const ENCRYPTION_ALGORITHM = 'AES-GCM' as const;

/** Sent once at the start of a transfer to describe the file. */
export const manifestSchema = z.object({
  kind: z.literal('manifest'),
  transferId: z.string().uuid(),
  name: z.string().min(1).max(512),
  size: z.number().int().nonnegative(),
  mime: z.string().max(255),
  totalChunks: z.number().int().nonnegative(),
  /** Negotiated plaintext chunk size in bytes. */
  chunkSize: z.number().int().positive(),
  encrypted: z.boolean(),
  hashAlgorithm: z.literal(HASH_ALGORITHM),
});
export type FileManifest = z.infer<typeof manifestSchema>;

/**
 * Header preceding each binary chunk. `hash` is the SHA-256 (hex) of the
 * *plaintext* chunk; `iv` is the 12-byte AES-GCM nonce (base64) when encrypted.
 */
export const chunkHeaderSchema = z.object({
  kind: z.literal('chunk'),
  index: z.number().int().nonnegative(),
  /** Byte length of the binary frame that follows (ciphertext length). */
  byteLength: z.number().int().nonnegative(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  iv: z.string().optional(),
});
export type ChunkHeader = z.infer<typeof chunkHeaderSchema>;

/** Receiver → sender: chunk persisted successfully. Enables flow control. */
export const ackSchema = z.object({
  kind: z.literal('ack'),
  index: z.number().int().nonnegative(),
});

/** Receiver → sender on (re)connect: chunks already held (for resume/mesh). */
export const haveSchema = z.object({
  kind: z.literal('have'),
  indices: z.array(z.number().int().nonnegative()),
});

/** Peer → peer: please (re)send these chunk indices (resume / mesh request). */
export const requestSchema = z.object({
  kind: z.literal('request'),
  indices: z.array(z.number().int().nonnegative()),
});

/** Receiver → sender: ready to receive (storage backend selected). */
export const readySchema = z.object({
  kind: z.literal('ready'),
  /** Indices the receiver already has from a previous session (resume). */
  resumeFrom: z.array(z.number().int().nonnegative()).default([]),
});

/** Sender → receiver: all chunks sent; carries the authoritative file hash. */
export const completeSchema = z.object({
  kind: z.literal('complete'),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/),
  totalChunks: z.number().int().nonnegative(),
});

/** Receiver → sender: final verification result. */
export const verifiedSchema = z.object({
  kind: z.literal('verified'),
  ok: z.boolean(),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const pauseSchema = z.object({ kind: z.literal('pause') });
export const resumeSchema = z.object({ kind: z.literal('resume') });
export const cancelSchema = z.object({ kind: z.literal('cancel'), reason: z.string().optional() });
export const transferErrorSchema = z.object({
  kind: z.literal('error'),
  message: z.string(),
});

/** Mesh coordination: host assigns a contiguous chunk range to a seeding peer. */
export const assignSchema = z.object({
  kind: z.literal('assign'),
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
});

export const transferMessageSchema = z.discriminatedUnion('kind', [
  manifestSchema,
  chunkHeaderSchema,
  ackSchema,
  haveSchema,
  requestSchema,
  readySchema,
  completeSchema,
  verifiedSchema,
  pauseSchema,
  resumeSchema,
  cancelSchema,
  transferErrorSchema,
  assignSchema,
]);
export type TransferMessage = z.infer<typeof transferMessageSchema>;

/** High-level transfer lifecycle used by the UI state machine. */
export const transferPhaseSchema = z.enum([
  'idle',
  'connecting',
  'awaiting-peer',
  'negotiating',
  'transferring',
  'paused',
  'verifying',
  'completed',
  'failed',
  'cancelled',
]);
export type TransferPhase = z.infer<typeof transferPhaseSchema>;
