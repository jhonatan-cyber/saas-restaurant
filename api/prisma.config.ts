import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 — Configuración de la CLI.
 * La URL de la base ya no vive en `schema.prisma` (datasource block).
 * Migrations y generate leen de acá.
 *
 * Para el runtime (PrismaClient) ver `src/prisma/prisma.service.ts`,
 * que usa el driver adapter `@prisma/adapter-mariadb`.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
