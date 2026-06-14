/**
 * @p2p/types — the single source of truth for every cross-process contract:
 * the Socket.io signaling protocol and the DataChannel transfer protocol.
 *
 * Schemas (Zod) and types are co-located so the server validates exactly what
 * the client is typed against — there is no way for the two to drift.
 */
export * from './common.js';
export * from './signaling.js';
export * from './events.js';
export * from './transfer.js';
