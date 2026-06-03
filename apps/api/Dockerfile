# Dockerfile — API (NestJS + Prisma + BullMQ)
FROM oven/bun:1 AS builder
WORKDIR /app

# Cache layer: deps
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/database/package.json ./packages/database/package.json 2>/dev/null || true
RUN bun install --frozen-lockfile

# Full source
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma client + build
WORKDIR /app/apps/api
RUN bunx prisma generate
RUN bun run build

# ============================================================
FROM oven/bun:1-slim AS production

RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends \
    ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/api

# Prisma runtime
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma

# Built API
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./

# Shared packages (needed for @saas/shared imports at runtime)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Node_modules from workspace root (hoisted deps)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001
ENV NODE_ENV=production

CMD ["sh", "-c", "bunx prisma migrate deploy && node dist/main.js"]
