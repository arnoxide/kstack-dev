# ── Single stage: install deps + run with tsx ─────────────────
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy workspace manifests (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/   packages/config/
COPY packages/types/    packages/types/
COPY packages/auth/     packages/auth/
COPY packages/db/       packages/db/
COPY apps/api/          apps/api/

# Install all deps (workspace symlinks resolved automatically)
RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api

# Run TypeScript directly — no compilation step needed
CMD ["./node_modules/.bin/tsx", "src/index.ts"]
