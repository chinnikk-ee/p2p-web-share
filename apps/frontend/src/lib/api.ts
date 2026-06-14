import { buildRtcConfiguration } from '@p2p/shared';
import { env } from '@/config/env';

interface IceConfigResponse {
  iceServers: RTCIceServer[];
}

/**
 * Fetches ICE servers from the signaling backend (so TURN credentials are not
 * baked into the client bundle). Falls back to the locally configured STUN
 * servers if the backend is unreachable.
 */
export async function fetchIceConfiguration(signal?: AbortSignal): Promise<RTCConfiguration> {
  try {
    const response = await fetch(`${env.signalingUrl}/ice-config`, { signal });
    if (!response.ok) throw new Error(`ice-config responded ${response.status}`);
    const data = (await response.json()) as IceConfigResponse;
    if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      return {
        iceServers: data.iceServers,
        iceCandidatePoolSize: 4,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      };
    }
  } catch {
    // Ignore and fall back to local STUN configuration below.
  }

  return buildRtcConfiguration({
    stunUrls: env.stunUrls,
    ...(env.turn ? { turn: env.turn } : {}),
  });
}

export async function fetchHealth(signal?: AbortSignal): Promise<{ status: string }> {
  const response = await fetch(`${env.signalingUrl}/health`, { signal });
  if (!response.ok) throw new Error(`health responded ${response.status}`);
  return (await response.json()) as { status: string };
}
