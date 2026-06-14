#!/usr/bin/env bash
# Run the full quality gate locally — mirrors the CI `verify` job.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "▶ Installing dependencies…"
pnpm install --frozen-lockfile

echo "▶ Lint…"
pnpm lint

echo "▶ Typecheck…"
pnpm typecheck

echo "▶ Test…"
pnpm test

echo "▶ Build…"
pnpm build

echo "✅ All checks passed."
