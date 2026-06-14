# ── Multi-stage build for the React SPA ───────────────────────────────────────
# Build context MUST be the monorepo root.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build
# Vite inlines VITE_* at build time, so they are build args, not runtime env.
ARG VITE_SIGNALING_URL=http://localhost:4000
ARG VITE_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
ENV VITE_SIGNALING_URL=$VITE_SIGNALING_URL
ENV VITE_STUN_URLS=$VITE_STUN_URLS
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@p2p/frontend..." run build

# ── Static file server ────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
