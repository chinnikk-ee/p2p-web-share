<div align="center">

# 🔗 P2P Web Share

### Direct, end-to-end encrypted, browser-to-browser file transfer

Drop a file → get a one-time link → the recipient downloads **straight from your browser** over an
encrypted WebRTC channel. A tiny signaling server brokers the handshake and **never sees a single
byte** of your file.

[![CI](https://github.com/your-org/p2p-web-share/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![WebRTC](https://img.shields.io/badge/WebRTC-DataChannel-ea4335)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ Highlights

- **Truly peer-to-peer** — files stream over a WebRTC `RTCDataChannel`; the server only relays SDP/ICE.
- **Zero-knowledge encryption** — AES-256-GCM in the browser. The key lives in the URL fragment
  (`#k=…`) and is **never transmitted to any server**.
- **Integrity guaranteed** — every chunk and the whole file are SHA-256 verified before download.
- **Any file size** — chunks stream to the **Origin Private File System** (or IndexedDB), so even
  multi-gigabyte files transfer without exhausting RAM.
- **Resumable & self-healing** — automatic ICE restart for transient drops, and resume-from-last-chunk
  recovery (persisted per room link) for hard drops.
- **Multi-peer** — several recipients can download the same file in parallel.
- **Polished UX** — drag & drop, live speed / ETA / progress, dark mode, glassmorphism, fully
  responsive, accessible, animated.

## 🧠 How it works

```
        ┌─────────────────────────┐   1. create room / join     ┌─────────────────────────┐
        │   Sender (browser A)    │ ─────── Socket.io ────────►  │  Signaling server (Node)│
        │                         │ ◄────── SDP / ICE ────────   │  • rooms & peers        │
        │  • reads File           │                              │  • rate limit + Zod     │
        │  • AES-GCM encrypt      │                              │  • NEVER sees file data │
        │  • SHA-256 per chunk    │                              └─────────────────────────┘
        └───────────┬─────────────┘                                          ▲
                    │                                                        │ 1. handshake only
                    │   2. encrypted WebRTC DataChannel (P2P, direct)        │
                    ▼                                                        │
        ┌─────────────────────────┐                              ┌──────────┴──────────────┐
        │  Receiver (browser B)    │ ◄──── chunks + hashes ────── │   Receiver (browser C)  │
        │  • decrypt + verify      │       (parallel peers)       │   (multi-peer download) │
        │  • OPFS / IndexedDB      │                              └─────────────────────────┘
        │  • verify whole-file hash│
        │  • auto-download         │
        └─────────────────────────┘
```

The key insight: **file bytes only ever travel over the DataChannel**, which is a direct,
DTLS-encrypted connection between the two browsers. The signaling server only exchanges connection
metadata. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full design.

## 🧱 Tech stack

| Layer        | Technology                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| Frontend     | React 19 · TypeScript · Vite · TailwindCSS · React Router · React Query · Zustand · shadcn-style UI · Framer Motion · Lucide |
| P2P          | WebRTC Data Channels (STUN + optional TURN)                                |
| Backend      | Node.js · Express · TypeScript · Socket.io                                 |
| Validation   | Zod (shared schemas — one source of truth for the wire protocol)           |
| Security     | Web Crypto API · AES-256-GCM · SHA-256                                      |
| Storage      | OPFS · IndexedDB · in-memory (auto-selected by file size)                  |
| Tooling      | pnpm workspaces · Turborepo · ESLint · Prettier · Vitest                   |
| Deploy       | Docker · Docker Compose · Vercel (frontend) · Railway (backend)            |

## 📁 Monorepo layout

```
p2p-web-share/
├── apps/
│   ├── backend/      Stateless Socket.io signaling server
│   └── frontend/     React 19 SPA — all crypto, storage & WebRTC live here
├── packages/
│   ├── types/        Zod schemas + protocol types (the contract)
│   ├── utils/        AES-GCM, streaming SHA-256, chunking, formatters
│   ├── shared/       Constants, tunables, ICE/TURN config builders
│   └── ui/           shadcn-style Tailwind primitives
├── docker/           nginx config for the frontend image
├── docs/             Architecture, API, deployment, env, troubleshooting, roadmap
├── scripts/          Repo helper scripts
└── .github/          CI workflow
```

Full breakdown: [docs/FOLDER_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md).

## 🚀 Quick start

### Prerequisites

- **Node.js ≥ 20**
- **pnpm ≥ 9** (`corepack enable` or `npm i -g pnpm`)

### Install & run

```bash
pnpm install

# create local env files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# run frontend (http://localhost:5173) + backend (http://localhost:4000) together
pnpm dev
```

Open **http://localhost:5173**, drop a file, then open the generated link in a second browser window
(or another device on your network) to watch the transfer happen live.

### With Docker

```bash
docker compose up --build
# frontend → http://localhost:8080   backend → http://localhost:4000
```

## 📜 Scripts

All scripts run through Turborepo at the repo root:

| Command            | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `pnpm dev`         | Run backend + frontend in watch mode                   |
| `pnpm build`       | Build every package and app                            |
| `pnpm test`        | Run all unit / integration / component tests (Vitest)  |
| `pnpm lint`        | ESLint (type-aware) across the workspace               |
| `pnpm typecheck`   | `tsc --noEmit` for every package                       |
| `pnpm format`      | Prettier write                                         |
| `pnpm docker:up`   | `docker compose up --build`                            |

## 🧪 Testing

- **Unit** — streaming SHA-256 (verified against the native digest), AES-GCM round-trips, chunking,
  formatters, the speed meter, and the DataChannel protocol codec.
- **Integration** — the Socket.io signaling server is exercised end-to-end over real sockets
  (create/join/relay/disconnect, validation, room capacity).
- **Component** — React components via Testing Library.

```bash
pnpm test
```

## 🔒 Security model

- File bytes never reach the server — they flow only over the DTLS-encrypted DataChannel.
- An extra application layer of **AES-256-GCM** is applied per chunk; the key is generated in the
  sender's browser and shared via the URL fragment, which browsers never send in HTTP requests.
- **SHA-256** verifies each chunk on arrival and the whole file before the download is triggered.
- Room IDs are generated with a CSPRNG; the signaling server validates every message with Zod and
  rate-limits each socket.

## 🚢 Deployment

Frontend → **Vercel**, backend → **Railway** (both have config committed), or self-host with the
provided Docker images. Step-by-step guide: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## 🌐 Browser support

Chrome/Edge 90+, Firefox 90+, Safari 16+. OPFS large-file streaming requires a Chromium-based
browser; other browsers automatically fall back to IndexedDB or in-memory storage.

## 🗺️ Roadmap

True BitTorrent-style mesh swarming, TURN auto-provisioning, PWA/offline, and more —
see [docs/ROADMAP.md](./docs/ROADMAP.md).

## 📄 License

MIT — see [LICENSE](./LICENSE).
