/** Static product metadata shared across UI and docs. */
export const APP = {
  NAME: 'P2P Web Share',
  SHORT_NAME: 'WebShare',
  TAGLINE: 'Direct, encrypted, browser-to-browser file transfer.',
  REPO_URL: 'https://github.com/chinnikk-ee/p2p-web-share',
} as const;

/** Route paths used by the frontend router (kept here for link-building). */
export const ROUTES = {
  HOME: '/',
  SEND: '/send',
  ROOM: '/room/:roomId',
  NOT_FOUND: '*',
} as const;

export function buildRoomPath(roomId: string): string {
  return `/room/${roomId}`;
}
