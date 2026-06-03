# Dockerfile — Web (TanStack Start SSR)
# Multi-stage build with security hardening

FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN bun install

# Copy source code
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Build-time env vars for Vite
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build application
WORKDIR /app/apps/web
RUN bun run build

# ============================================================
FROM node:22-alpine

# Create non-root user
RUN addgroup -g 1100 webapp && \
    adduser -D -u 1100 -G webapp webapp

WORKDIR /app/apps/web

# Copy built output and dependencies
COPY --from=builder --chown=webapp:webapp /app/apps/web/dist ./dist
COPY --from=builder --chown=webapp:webapp /app/apps/web/package.json ./
COPY --chown=webapp:webapp apps/web/serve.mjs ./serve.mjs
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/web/node_modules ./node_modules

USER webapp

EXPOSE 3000

ENV NODE_ENV=production
ENV API_INTERNAL_URL=http://api:3001/api
ENV API_INTERNAL_BASE_URL=http://api:3001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "serve.mjs"]
