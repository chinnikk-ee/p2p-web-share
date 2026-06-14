import { DATACHANNEL_CONFIG, DATACHANNEL_LABEL } from '@p2p/shared';
import type { SignalData } from '@p2p/types';
import { TypedEmitter } from '@p2p/utils';

interface PeerConnectionEvents {
  /** A signal that must be relayed to the remote peer via the signaling server. */
  signal: SignalData;
  /** Data channel became available (answerer side). */
  datachannel: RTCDataChannel;
  open: void;
  close: void;
  statechange: RTCPeerConnectionState;
  error: Error;
}

/**
 * Wraps a single `RTCPeerConnection`. The `initiator` (the file host) creates
 * the reliable, ordered data channel and the SDP offer; the responder answers.
 * Handles ICE trickling, buffering candidates that arrive before the remote
 * description, and ICE restart for connection recovery.
 */
export class PeerConnection extends TypedEmitter<PeerConnectionEvents> {
  readonly pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private closed = false;

  constructor(
    config: RTCConfiguration,
    private readonly initiator: boolean,
  ) {
    super();
    this.pc = new RTCPeerConnection(config);
    this.wireConnection();

    if (initiator) {
      const channel = this.pc.createDataChannel(DATACHANNEL_LABEL, DATACHANNEL_CONFIG);
      channel.binaryType = 'arraybuffer';
      this.channel = channel;
      this.wireChannel(channel);
    }
  }

  get dataChannel(): RTCDataChannel | null {
    return this.channel;
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  /** Initiator only: create and send the initial offer. */
  async start(): Promise<void> {
    if (!this.initiator) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.emit('signal', { type: 'offer', sdp: offer.sdp ?? '' });
  }

  /** Apply an inbound signal (offer / answer / candidate / ice-restart). */
  async handleSignal(signal: SignalData): Promise<void> {
    if (this.closed) return;
    switch (signal.type) {
      case 'offer': {
        await this.pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        this.remoteDescriptionSet = true;
        await this.flushCandidates();
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.emit('signal', { type: 'answer', sdp: answer.sdp ?? '' });
        break;
      }
      case 'answer': {
        await this.pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        this.remoteDescriptionSet = true;
        await this.flushCandidates();
        break;
      }
      case 'candidate': {
        if (!this.remoteDescriptionSet) {
          this.pendingCandidates.push(signal.candidate);
        } else {
          await this.pc.addIceCandidate(signal.candidate).catch(() => undefined);
        }
        break;
      }
      case 'ice-restart': {
        await this.restartIce();
        break;
      }
    }
  }

  /** Triggers ICE renegotiation to recover a dropped connection. */
  async restartIce(): Promise<void> {
    if (this.closed) return;
    if (!this.initiator) {
      // Ask the initiator to restart; only it can produce the new offer.
      this.emit('signal', { type: 'ice-restart' });
      return;
    }
    const offer = await this.pc.createOffer({ iceRestart: true });
    await this.pc.setLocalDescription(offer);
    this.emit('signal', { type: 'offer', sdp: offer.sdp ?? '' });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.channel?.close();
      this.pc.close();
    } finally {
      this.removeAllListeners();
    }
  }

  private async flushCandidates(): Promise<void> {
    const candidates = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of candidates) {
      await this.pc.addIceCandidate(candidate).catch(() => undefined);
    }
  }

  private wireConnection(): void {
    this.pc.onicecandidate = (event) => {
      const candidate = event.candidate;
      if (candidate) {
        this.emit('signal', {
          type: 'candidate',
          candidate: {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
            usernameFragment: candidate.usernameFragment,
          },
        });
      }
    };
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      this.emit('statechange', state);
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        this.emit('close', undefined);
      }
    };
    this.pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.binaryType = 'arraybuffer';
      this.channel = channel;
      this.wireChannel(channel);
      this.emit('datachannel', channel);
    };
  }

  private wireChannel(channel: RTCDataChannel): void {
    channel.onopen = () => this.emit('open', undefined);
    channel.onclose = () => this.emit('close', undefined);
    channel.onerror = (event) => {
      const error = event.error;
      this.emit('error', error instanceof Error ? error : new Error('Data channel error'));
    };
  }
}
