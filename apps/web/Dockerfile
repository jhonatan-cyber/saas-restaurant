# Dockerfile — Web (TanStack Start SSR)
FROM oven/bun:1 AS builder
WORKDIR /app

# Cache layer: deps
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

# Full source
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Build
WORKDIR /app/apps/web
RUN bun run build

# ============================================================
FROM node:22-alpine AS production
WORKDIR /app/apps/web

# Built output (TanStack Start SSR -> .output/)
COPY --from=builder /app/apps/web/.output ./.output
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
