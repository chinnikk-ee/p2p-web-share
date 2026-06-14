import { z } from 'zod';
import { peerIdSchema, peerInfoSchema, roomIdSchema } from './common.js';

/**
 * SDP offer/answer payload. We carry the raw SDP string produced by
 * `RTCPeerConnection.createOffer()/createAnswer()`.
 */
export const sdpSignalSchema = z.object({
  type: z.enum(['offer', 'answer']),
  sdp: z.string().min(1),
});

/** Mirrors `RTCIceCandidateInit`. `candidate: ''` marks end-of-candidates. */
export const iceCandidateSignalSchema = z.object({
  type: z.literal('candidate'),
  candidate: z.object({
    candidate: z.string(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.number().int().nullable().optional(),
    usernameFragment: z.string().nullable().optional(),
  }),
});

/** Request the remote peer to perform an ICE restart (connection recovery). */
export const iceRestartSignalSchema = z.object({
  type: z.literal('ice-restart'),
});

/** Discriminated union of everything relayed verbatim between peers. */
export const signalDataSchema = z.discriminatedUnion('type', [
  sdpSignalSchema,
  iceCandidateSignalSchema,
  iceRestartSignalSchema,
]);
export type SignalData = z.infer<typeof signalDataSchema>;

// ── Client → Server payloads ────────────────────────────────────────────────

export const createRoomSchema = z.object({
  label: z.string().max(40).optional(),
});
export type CreateRoomPayload = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  roomId: roomIdSchema,
  label: z.string().max(40).optional(),
});
export type JoinRoomPayload = z.infer<typeof joinRoomSchema>;

export const relaySignalSchema = z.object({
  to: peerIdSchema,
  signal: signalDataSchema,
});
export type RelaySignalPayload = z.infer<typeof relaySignalSchema>;

// ── Server → Client payloads ─────────────────────────────────────────────────

export const roomCreatedSchema = z.object({
  roomId: roomIdSchema,
  peerId: peerIdSchema,
  createdAt: z.number().int(),
});
export type RoomCreatedPayload = z.infer<typeof roomCreatedSchema>;

export const roomJoinedSchema = z.object({
  roomId: roomIdSchema,
  peerId: peerIdSchema,
  peers: z.array(peerInfoSchema),
});
export type RoomJoinedPayload = z.infer<typeof roomJoinedSchema>;

export const peerJoinedSchema = z.object({ peer: peerInfoSchema });
export type PeerJoinedPayload = z.infer<typeof peerJoinedSchema>;

export const peerLeftSchema = z.object({ peerId: peerIdSchema });
export type PeerLeftPayload = z.infer<typeof peerLeftSchema>;

export const incomingSignalSchema = z.object({
  from: peerIdSchema,
  signal: signalDataSchema,
});
export type IncomingSignalPayload = z.infer<typeof incomingSignalSchema>;

export const roomClosedSchema = z.object({
  roomId: roomIdSchema,
  reason: z.string(),
});
export type RoomClosedPayload = z.infer<typeof roomClosedSchema>;
