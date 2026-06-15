# P2P Web Share

Decentralized, browser-to-browser file sharing over WebRTC. Drop a file to generate a one-time share
link; the recipient opens the link and connects **directly to your browser**, and the file streams
peer-to-peer over an encrypted WebRTC data channel. A small Node.js signaling server only brokers the
initial handshake — **file bytes never pass through any server**.

Files are AES-256-GCM encrypted in the browser (the decryption key travels only in the URL fragment,
`#k=…`, and is never sent to the server) and verified with SHA-256 on arrival. Large files stream to
local storage (IndexedDB/OPFS) instead of RAM, and interrupted downloads resume from the last saved
chunk.

**Tech stack:** React 19 · TypeScript · Vite · Tailwind CSS · WebRTC data channels · Node.js ·
Express · Socket.io · pnpm workspaces + Turborepo.

## How it works

1. **Room + link.** The sender drops a file; the app opens a room on the signaling server and builds a
   one-time link. A fresh AES-256 key is generated in the browser and appended to the link's `#k=`
   fragment — browsers never send the fragment in HTTP requests, so the server never sees the key.
2. **Signaling handshake.** When the receiver opens the link, the two browsers exchange WebRTC
   connection details (SDP offers/answers and ICE candidates) _through_ the Socket.io server. The
   server only relays these handshake blobs to introduce the peers — nothing else.
3. **Direct P2P channel.** Once connected, a WebRTC data channel opens **directly between the two
   browsers** (DTLS-encrypted by WebRTC itself). From here on, the signaling server is out of the loop.
4. **Chunked, verified transfer.** The sender reads the file in chunks, AES-256-GCM encrypts each one,
   and sends a SHA-256 hash header followed by the bytes. The receiver decrypts, checks the hash, and
   stores the chunk. Backpressure prevents the channel from overflowing on fast links.
5. **Smart storage.** Small files stay in memory; large files stream to **IndexedDB/OPFS** so
   multi-hundred-MB transfers don't exhaust RAM.
6. **Verify + auto-download.** After the final chunk, the receiver re-hashes the whole file against the
   sender's hash. On a match, the file **auto-downloads** — guaranteeing zero corruption.
7. **Resume.** Saved chunks and room metadata persist locally, so an interrupted transfer (reload or
   dropped connection) picks up from the last verified chunk instead of restarting.

## Project structure

```
apps/
  backend/   Node + Socket.io signaling server (rooms, SDP/ICE relay — never sees files)
  frontend/  React SPA — all WebRTC, crypto, storage, and UI live here
packages/
  types/     Zod schemas + shared protocol / message types (the contract)
  utils/     AES-256-GCM, streaming SHA-256, chunking, formatters
  shared/    Constants & tunables (chunk sizes, timeouts, ICE config)
  ui/        Reusable Tailwind UI primitives
```

The transfer engine lives in `apps/frontend/src/webrtc/`:

- **`SenderSession` / `ReceiverSession`** — orchestrate a transfer end to end
- **`FileSender` / `FileReceiver`** — chunk, encrypt/decrypt, hash, and verify
- **`PeerConnection`** — wraps the WebRTC `RTCPeerConnection` + data channel
- **`SignalingClient`** — talks to the signaling server over Socket.io
- **`protocol.ts`** — the on-wire message format
- **`storage/`** — memory / IndexedDB / OPFS chunk stores + resume metadata

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable`)

## Setup (local development)

```bash
# 1. Install dependencies
pnpm install

# 2. Create local env files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 3. Run the frontend + backend together
pnpm dev
```

- Frontend → http://localhost:5173
- Backend (signaling) → http://localhost:4000

Open the frontend, drop a file, then open the generated link in a second browser window (or another
device) to watch the transfer happen live.

### Run with Docker (optional)

```bash
docker compose up --build
# Frontend → http://localhost:8080
# Backend  → http://localhost:4000
```

## Deployment

| Service             | Platform | URL                                            |
| ------------------- | -------- | ---------------------------------------------- |
| Frontend            | Vercel   | https://p2p-web-share-frontend-eta.vercel.app  |
| Backend (signaling) | Render   | https://p2p-backend-c49f.onrender.com          |

**Live app → https://p2p-web-share-frontend-eta.vercel.app**
