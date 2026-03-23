# ── Stage 1: deps + build ─────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/   packages/config/
COPY packages/types/    packages/types/
COPY packages/auth/     packages/auth/
COPY packages/db/       packages/db/
COPY apps/api/          apps/api/

# Install all deps (workspace packages are resolved via symlinks)
RUN pnpm install --frozen-lockfile

# Build the API (tsc compiles src/ → dist/)
RUN pnpm --filter @kasify/api build

# ── Stage 2: lean runtime image ───────────────────────────────
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/   packages/config/
COPY packages/types/    packages/types/
COPY packages/auth/     packages/auth/
COPY packages/db/       packages/db/
COPY apps/api/package.json apps/api/package.json

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled API output from builder
COPY --from=builder /app/apps/api/dist apps/api/dist

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api

# Run migrations then start
CMD ["sh", "-c", "node -e \"require('../db/src/client')\" 2>/dev/null; node dist/index.js"]
