# Dockerfile — API (NestJS + Prisma + BullMQ)
# Multi-stage build with security hardening

FROM oven/bun:1 AS builder
WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy app and package manifests before installing (for layer caching)
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install

# Now copy all source code
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma client and build
WORKDIR /app/apps/api
RUN bunx prisma generate && bun run build

# ============================================================
FROM oven/bun:1-slim AS production

# Install runtime dependencies  
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 nestapp && mkdir -p /app && chown -R nestapp:nestapp /app

WORKDIR /app/apps/api

# Copy Prisma schema (needed for migrations)
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma 2>/dev/null || true

# Copy built code
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./

# Copy shared packages (runtime deps)
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/

# Copy hoisted node_modules from workspace root
COPY --from=builder /app/node_modules ./node_modules

USER nestapp
EXPOSE 3001
ENV NODE_ENV=production

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD bun run -e "const res = await fetch('http://localhost:3001'); process.exit(res.ok ? 0 : 1)" 2>/dev/null || exit 1

CMD ["sh", "-c", "bunx prisma migrate deploy && node dist/main.js"]
