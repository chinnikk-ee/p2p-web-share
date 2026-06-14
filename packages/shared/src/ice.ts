/**
 * Builds the `RTCIceServer[]` used to construct peer connections. STUN is
 * always present (for NAT traversal); TURN is optional and only added when
 * relay credentials are supplied — the placeholder config keeps the app
 * functional behind symmetric NATs once a TURN server is provisioned.
 */
export interface IceConfigInput {
  stunUrls: string[];
  turn?: {
    url: string;
    username: string;
    credential: string;
  };
}

export const DEFAULT_STUN_URLS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
] as const;

export function buildIceServers(input: IceConfigInput): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  const stun = input.stunUrls.filter(Boolean);
  if (stun.length > 0) {
    servers.push({ urls: stun });
  }

  if (input.turn?.url && input.turn.username && input.turn.credential) {
    servers.push({
      urls: input.turn.url,
      username: input.turn.username,
      credential: input.turn.credential,
    });
  }

  return servers;
}

/** Full `RTCConfiguration` with sane defaults for file transfer. */
export function buildRtcConfiguration(input: IceConfigInput): RTCConfiguration {
  return {
    iceServers: buildIceServers(input),
    iceCandidatePoolSize: 4,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}
