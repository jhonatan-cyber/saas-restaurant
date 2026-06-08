# Dockerfile — Web (TanStack Start SSR)
# Multi-stage build with security hardening

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

RUN bun install

# ============================================================
FROM base AS dev

# Copy source code for dev runtime
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

WORKDIR /app/apps/admin

ENV NODE_ENV=development

CMD ["bun", "run", "dev"]

# ============================================================
FROM base AS builder

# Copy source code
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

# Build-time env vars for Vite
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build application
WORKDIR /app/apps/admin
RUN bun run build

# ============================================================
FROM oven/bun:1-alpine

# Create non-root user
RUN addgroup -g 1100 webapp && \
    adduser -D -u 1100 -G webapp webapp

WORKDIR /app/apps/admin

# Copy package manifests for dependency installation
COPY --from=builder /app/package.json /app/
COPY --from=builder /app/bun.lock /app/
COPY --from=builder /app/apps/admin/package.json /app/apps/admin/
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/
COPY --from=builder /app/packages/ui/package.json /app/packages/ui/

# Install production dependencies fresh (avoids Bun node_modules symlink issues across stages)
RUN cd /app && bun install --production

# Copy built output
COPY --from=builder --chown=webapp:webapp /app/apps/admin/dist ./dist
COPY --chown=webapp:webapp apps/admin/serve.mjs ./serve.mjs

# Copy shared packages (needed at runtime for SSR imports)
COPY --from=builder --chown=webapp:webapp /app/packages/shared ./packages/shared
COPY --from=builder --chown=webapp:webapp /app/packages/ui ./packages/ui

USER webapp

EXPOSE 3000

ENV NODE_ENV=production
ENV API_INTERNAL_URL=http://api:3001/api
ENV API_INTERNAL_BASE_URL=http://api:3001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD bun -e "try{const r=await fetch('http://127.0.0.1:3000/');process.exit(r.status<500?0:1)}catch{process.exit(1)}"

CMD ["bun", "run", "serve.mjs"]
