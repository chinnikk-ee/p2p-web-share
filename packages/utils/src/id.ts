/**
 * Room ID generation. Uses a Crockford-style alphabet (no 0/O/1/I/l) so IDs
 * are unambiguous when read aloud or typed. ~16 chars over a 57-symbol
 * alphabet yields ~93 bits of entropy — collision-resistant for room scope.
 */
const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function generateRoomId(length = 16): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length));
  let id = '';
  for (let i = 0; i < length; i += 1) {
    id += ROOM_ALPHABET[(bytes[i] as number) % ROOM_ALPHABET.length];
  }
  return id;
}

/** RFC 4122 v4 UUID via the platform CSPRNG. */
export function generateUuid(): string {
  return globalThis.crypto.randomUUID();
}
