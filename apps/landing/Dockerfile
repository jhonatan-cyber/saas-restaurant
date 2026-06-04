# Stage 1: build
FROM oven/bun:1.3.11 AS builder
WORKDIR /app
COPY package.json bunfig.toml bun.lock tsconfig.base.json ./
COPY apps/landing/package.json ./apps/landing/package.json
RUN bun install
COPY apps/landing ./apps/landing
RUN cd apps/landing && bunx astro build

# Stage 2: serve
FROM nginx:alpine
COPY --from=builder /app/apps/landing/dist /usr/share/nginx/landing
EXPOSE 80
