#!/bin/sh
# entrypoint-api.sh — Corre migraciones + inicia API
set -e

echo "→ Ejecutando migraciones de Prisma..."
bunx prisma migrate deploy

echo "→ Iniciando API..."
exec node dist/main.js
