import { randomBytes, randomUUID } from 'node:crypto';

/**
 * Server-side ID generation backed by Node's CSPRNG. Mirrors the client's
 * alphabet so room IDs look identical regardless of who created them.
 */
const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function generateRoomId(length = 16): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i += 1) {
    id += ROOM_ALPHABET[(bytes[i] as number) % ROOM_ALPHABET.length];
  }
  return id;
}

export function generateUuid(): string {
  return randomUUID();
}
