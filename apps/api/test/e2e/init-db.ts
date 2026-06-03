/**
 * Inicializa la base de datos de testing.
 *
 * 1. Conecta al servidor MySQL (sin BD específica) para crear la BD test
 * 2. Ejecuta prisma db push --force-reset para sync el schema
 *
 * Uso: bun run test:e2e:setup
 * Pre-requisito: MySQL corriendo en localhost con el usuario configurado
 */
import { execSync } from 'node:child_process';
import { createConnection } from 'mariadb';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }

  const u = new URL(dbUrl);
  const dbName = u.pathname.replace(/^\//, '');

  console.log(`🔧 Creando base de datos "${dbName}"...`);
  const conn = await createConnection({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    // No especificamos database — queremos crear la BD
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
  console.log(`✅ Base de datos "${dbName}" lista`);

  console.log('🔧 Pusheando schema con prisma db push...');
  execSync('bunx prisma db push --force-reset --accept-data-loss', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  console.log('✅ Schema listo');
}

main().catch((err) => {
  console.error('❌ Error inicializando BD de test:', err);
  process.exit(1);
});
