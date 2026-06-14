import { transferMessageSchema, type TransferMessage } from '@p2p/types';

/** Serializes a control frame for the data channel. */
export function encodeMessage(message: TransferMessage): string {
  return JSON.stringify(message);
}

/**
 * Parses and validates an inbound control frame. Returns null for anything that
 * is not a well-formed protocol message (defensive against corrupt peers).
 */
export function decodeMessage(raw: string): TransferMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = transferMessageSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
