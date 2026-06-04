# Dockerfile — API (NestJS + Prisma + BullMQ)
# Multi-stage build with security hardening

FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN bun install

# Copy source code
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma client and build
WORKDIR /app/apps/api
RUN bunx prisma generate && bun run build

# ============================================================
FROM oven/bun:1-alpine AS production

# Install runtime dependencies  
RUN apk add --no-cache ca-certificates openssl

# Create non-root user
RUN addgroup -g 1001 nestapp && adduser -D -u 1001 -G nestapp nestapp && \
    mkdir -p /app && chown -R nestapp:nestapp /app

WORKDIR /app

# Copy package manifests for dependency installation
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Install production dependencies fresh (avoids Bun node_modules symlink issues across stages)
RUN bun install --production

# Copy Prisma schema + config (needed for prisma generate)
COPY --from=builder --chown=nestapp:nestapp /app/apps/api/prisma ./apps/api/prisma
COPY --chown=nestapp:nestapp apps/api/prisma.config.js ./apps/api/prisma.config.js

# Generate Prisma client for production runtime (needs DATABASE_URL even for generate)
ENV DATABASE_URL=mysql://dummy:dummy@localhost:3306/dummy
RUN cd /app/apps/api && bunx prisma generate --config prisma.config.js

# Copy built application 
COPY --from=builder --chown=nestapp:nestapp /app/apps/api/dist ./apps/api/dist

# Copy shared packages
COPY --from=builder --chown=nestapp:nestapp /app/packages/shared ./packages/shared

USER nestapp

WORKDIR /app
EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD bun -e "try{const r=await fetch('http://127.0.0.1:3001/api');process.exit(r.status<500?0:1)}catch{process.exit(1)}"

CMD ["sh", "-c", "cd /app/apps/api && bunx prisma migrate deploy --config prisma.config.js && cd /app && bun apps/api/dist/apps/api/src/main.js"]
