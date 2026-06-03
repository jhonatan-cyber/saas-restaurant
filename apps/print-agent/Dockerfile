# Dockerfile — Print Agent (Bun Hono ESC/POS)
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/print-agent/package.json ./apps/print-agent/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/print-agent ./apps/print-agent

# ============================================================
FROM oven/bun:1-slim AS production
WORKDIR /app/apps/print-agent

COPY --from=builder /app/apps/print-agent/src ./src
COPY --from=builder /app/apps/print-agent/package.json ./
COPY --from=builder /app/apps/print-agent/printers.json ./printers.json 2>/dev/null || true
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3002
ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"]
