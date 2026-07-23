# Makefile — Saas Restaurant

.PHONY: dev dev-api dev-app dev-admin dev-landing dev-print-agent dev-all typecheck lint test clean

# ==================== Desarrollo ====================

dev:
	bun run dev

dev-api:
	cd api && bun run start:dev

dev-app:
	cd app && bun run dev

dev-admin:
	cd admin && bun run dev

dev-landing:
	cd landing && bun run dev

dev-print-agent:
	cd print-agent && bun run dev

dev-all:
	bun run dev:all

# ==================== Base de datos ====================

# Cargar .env de la raíz para todos los comandos de Prisma
db-migrate:
	cd api && dotenv -e ../.env -- bunx prisma migrate deploy

db-generate:
	cd api && dotenv -e ../.env -- bunx prisma generate

db-studio:
	cd api && dotenv -e ../.env -- bunx prisma studio

db-seed:
	cd api && dotenv -e ../.env -- bunx tsx prisma/seed.ts

# ==================== Utilidades ====================

typecheck:
	cd api && bun run typecheck
	cd app && bun run typecheck
	cd admin && bun run typecheck
	cd landing && bun run typecheck
	cd print-agent && bun run typecheck
	cd packages/shared && bun run typecheck

lint:
	bun run lint

test:
	bun run test

clean:
	rm -rf api/dist app/.output app/.vite landing/dist print-agent/dist
	find . -name node_modules -type d -prune -exec rm -rf {} +
