#!/usr/bin/env bash
# fix-build.sh - Fix known build issues before Docker build

set -e

echo "Regenerating Prisma client..."
cd apps/api
bunx prisma generate
cd ../../

echo "Ensuring bun.lock is updated..."
bun install --no-save

echo "Build prerequisites complete. You can now run: docker compose build"
