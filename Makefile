# Makefile — Saas Restaurant

.PHONY: dev prod build up down logs api web psql

# ==================== Desarrollo ====================

dev:
	bun run dev

dev-api:
	cd apps/api && bun run start:dev

dev-web:
	cd apps/admin && bun run dev

# ==================== Docker Desarrollo ====================

docker-dev:
	docker compose up -d --build api admin landing print-agent mysql redis

docker-dev-apps:
	docker compose up -d --build api admin landing print-agent

docker-dev-infra:
	docker compose up -d mysql redis phpmyadmin

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-ps:
	docker compose ps

docker-restart:
	docker compose restart

docker-clean:
	docker compose down -v
	docker image prune -f

docker-reset:
	docker compose down -v --rmi local
	docker volume prune -f

# ==================== Docker SSL / Certificados ====================

prod-ssl-init:
	@echo "Run: DOMAIN=tu-dominio.com make prod-ssl-init"
	@test -n "$(DOMAIN)" || (echo "ERROR: DOMAIN variable is required" && exit 1)
	docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d $(DOMAIN)

prod-ssl-renew:
	docker compose -f docker-compose.prod.yml exec certbot certbot renew
	docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# ==================== Docker Multi-Branch ====================docker-branch-up:
	@BRANCH=$$(git branch --show-current | tr '/' '-'); \
	echo "Starting dev for branch: $$BRANCH"; \
	docker compose -p saas-$$BRANCH up -d --build api admin landing print-agent mysql redis
docker-branch-down:
	@BRANCH=$$(git branch --show-current | tr '/' '-'); \
	docker compose -p saas-$$BRANCH down
docker-branch-logs:
	@BRANCH=$$(git branch --show-current | tr '/' '-'); \
	docker compose -p saas-$$BRANCH logs -f

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
