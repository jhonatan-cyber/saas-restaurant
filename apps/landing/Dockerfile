# Stage 0: base
FROM oven/bun:1.3.11 AS base
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/landing/package.json ./apps/landing/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN bun install

# Stage 1: dev
FROM base AS dev
COPY apps/landing ./apps/landing
COPY packages/ui ./packages/ui
WORKDIR /app/apps/landing
ENV NODE_ENV=development
CMD ["bun", "run", "dev"]

# Stage 2: build
FROM base AS builder
COPY apps/landing ./apps/landing
COPY packages/ui ./packages/ui
RUN cd apps/landing && bunx astro build

# Stage 3: serve
FROM nginx:alpine
COPY --from=builder /app/apps/landing/dist /usr/share/nginx/html
EXPOSE 80
