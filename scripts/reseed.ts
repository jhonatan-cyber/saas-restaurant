/**
 * Clean and re-seed the database.
 * Run: bun run scripts/reseed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log('🗑️  Limpiando datos existentes...');

  // Disable FK checks, delete in order, re-enable
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');

  const tables = [
    'shift',
    'cash_register',
    'order_item',
    'order_state_log',
    'order',
    'payment',
    'restaurant_table',
    'table_state_log',
    'customer',
    'purchase_item',
    'purchase',
    'inventory_movement',
    'supplier',
    'cash_movement',
    'product',
    'report',
    'category',
    'preparation_area',
    'pos_station',
    'audit_log',
    'user',
    'branch',
    'subscription',
    'business',
    'plan',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\``);
      console.log(`  ✅ ${table} limpiada`);
    } catch {
      console.log(`  ⏭️  ${table} saltada (no existe o no se puede limpiar)`);
    }
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  console.log('✅ Base de datos limpia');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
