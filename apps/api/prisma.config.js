// prisma.config.js — Production-compatible config (CommonJS).
// Used by Prisma CLI inside the Docker container via --config flag.
// DATABASE_URL is injected via docker-compose environment.
//
// In bun workspaces, prisma is hoisted to /app/node_modules/.bun/prisma@x.y.z+hash/...
// We resolve the path dynamically to avoid hardcoding the hash.

const fs = require('fs');
const path = require('path');

function resolvePrismaConfig() {
  // Try standard resolution first
  try {
    return require('prisma/config');
  } catch (_) {}

  // Fallback: search in bun's virtual node_modules
  const bunModulesDir = '/app/node_modules/.bun';
  if (fs.existsSync(bunModulesDir)) {
    const entries = fs.readdirSync(bunModulesDir);
    const prismaEntry = entries.find(e => e.startsWith('prisma@'));
    if (prismaEntry) {
      const configPath = path.join(bunModulesDir, prismaEntry, 'node_modules/prisma/config.js');
      if (fs.existsSync(configPath)) {
        return require(configPath);
      }
    }
  }

  throw new Error('Could not resolve prisma/config module');
}

const { defineConfig, env } = resolvePrismaConfig();

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
