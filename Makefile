# Makefile — Saas Restaurant

.PHONY: dev dev-api dev-web typecheck clean

# ==================== Desarrollo ====================

dev:
	bun run dev

dev-api:
	cd apps/api && bun run start:dev

dev-web:
	cd apps/admin && bun run dev

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
