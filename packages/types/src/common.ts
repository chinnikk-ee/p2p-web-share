import { z } from 'zod';

/**
 * Identifiers. Room IDs are human-shareable; peer IDs are opaque UUIDs
 * assigned by the signaling server (never trusted from the client).
 */
export const roomIdSchema = z
  .string()
  .min(6)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Room ID must be URL-safe');

export const peerIdSchema = z.string().uuid();

export type RoomId = z.infer<typeof roomIdSchema>;
export type PeerId = z.infer<typeof peerIdSchema>;

/**
 * A peer's role within a room. The "host" is whoever created the room and
 * holds the source file; "guest" peers join to receive (and, in mesh mode,
 * may re-seed chunks they already hold).
 */
export const peerRoleSchema = z.enum(['host', 'guest']);
export type PeerRole = z.infer<typeof peerRoleSchema>;

export const peerInfoSchema = z.object({
  id: peerIdSchema,
  role: peerRoleSchema,
  joinedAt: z.number().int().nonnegative(),
  /** Optional display label, sanitized on the server. */
  label: z.string().max(40).optional(),
});
export type PeerInfo = z.infer<typeof peerInfoSchema>;

/** Stable error codes shared between server and client. */
export const errorCodeSchema = z.enum([
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'INVALID_PAYLOAD',
  'RATE_LIMITED',
  'PEER_NOT_FOUND',
  'NOT_IN_ROOM',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const protocolErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
});
export type ProtocolError = z.infer<typeof protocolErrorSchema>;
