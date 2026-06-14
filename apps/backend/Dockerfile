# ── Multi-stage build for the signaling server ───────────────────────────────
# Build context MUST be the monorepo root so workspace packages are available.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

# ── Install + build (with workspace dependencies) ─────────────────────────────
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# `@p2p/backend...` builds the backend and only its workspace dependencies.
RUN pnpm --filter "@p2p/backend..." run build
# Produce a self-contained directory with production deps + built dist.
RUN pnpm --filter "@p2p/backend" deploy --prod /prod/backend

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/backend ./
EXPOSE 4000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
