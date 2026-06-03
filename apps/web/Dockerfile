# Dockerfile — Web (TanStack Start SSR)
# Multi-stage build with security hardening

FROM oven/bun:1 AS builder
WORKDIR /app

# Stage 1: Install dependencies
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN bun install

# Stage 2: Build application
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN bun run build

# Stage 3: Production runtime
FROM node:22-alpine

# Create non-root user for security
RUN addgroup -g 1100 webapp && \
    adduser -D -u 1100 -G webapp webapp

WORKDIR /app

# Copy built output
COPY --from=builder --chown=webapp:webapp /app/apps/web/.output ./apps/web/.output
COPY --from=builder --chown=webapp:webapp /app/apps/web/package.json ./apps/web/

# Copy node_modules (hoisted at root level)
COPY --from=builder /app/node_modules ./node_modules

# Remove source maps to reduce image size
RUN find node_modules -type f -name "*.map" -delete && \
    find ./apps/web/.output -type f -name "*.map" -delete

USER webapp

WORKDIR /app/apps/web
EXPOSE 3000

ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
