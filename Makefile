# Makefile — Saas Restaurant

.PHONY: dev prod build up down logs api web psql

# ==================== Desarrollo ====================

dev:
	bun run dev

dev-api:
	cd apps/api && bun run start:dev

dev-web:
	cd apps/admin && bun run dev

# ==================== Docker Producción ====================

prod-build:
	docker compose -f docker-compose.prod.yml build

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-ps:
	docker compose -f docker-compose.prod.yml ps

# ==================== Base de datos ====================

db-migrate:
	cd apps/api && bunx prisma migrate deploy

db-generate:
	cd apps/api && bunx prisma generate

db-studio:
	cd apps/api && bunx prisma studio

db-seed:
	cd apps/api && bunx tsx prisma/seed.ts

# ==================== Utilidades ====================

typecheck:
	cd apps/api && bun run typecheck
	cd apps/admin && bun run typecheck

clean:
	rm -rf apps/api/dist apps/admin/.output apps/admin/.vite
	find . -name node_modules -type d -prune -exec rm -rf {} +
