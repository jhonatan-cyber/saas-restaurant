# Dockerfile — Print Agent (Bun Hono ESC/POS)
# Multi-stage build optimized for minimal size

FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: Install dependencies
COPY package.json bun.lock ./
COPY apps/print-agent/package.json ./apps/print-agent/
COPY packages/shared/package.json ./packages/shared/

RUN bun install

# ============================================================
FROM base AS dev

# Copy source code
COPY tsconfig.base.json ./
COPY apps/print-agent ./apps/print-agent

WORKDIR /app/apps/print-agent

ENV NODE_ENV=development

CMD ["bun", "run", "--hot", "src/index.ts"]

# ============================================================
FROM base AS builder

# Copy source code
COPY tsconfig.base.json ./
COPY apps/print-agent ./apps/print-agent

# ============================================================
# Production runtime
FROM oven/bun:1-slim

# Create non-root user
RUN useradd -m -u 1002 printapp && \
    mkdir -p /app/apps/print-agent && \
    chown -R printapp:printapp /app

WORKDIR /app/apps/print-agent

# Copy application source
COPY --from=builder --chown=printapp:printapp /app/apps/print-agent/src ./src
COPY --from=builder --chown=printapp:printapp /app/apps/print-agent/package.json ./
COPY --from=builder --chown=printapp:printapp /app/apps/print-agent/tsconfig.json ./

# Copy hoisted node_modules from workspace root
COPY --from=builder /app/node_modules /app/node_modules
# Copy print-agent's own node_modules (hono lives here when bun uses isolated linker)
COPY --from=builder /app/apps/print-agent/node_modules ./node_modules

USER printapp

EXPOSE 3002

ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD bun run -e "const res = await fetch('http://localhost:3002/health'); process.exit(res.ok ? 0 : 1)" || exit 1

CMD ["bun", "run", "src/index.ts"]
