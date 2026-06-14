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
