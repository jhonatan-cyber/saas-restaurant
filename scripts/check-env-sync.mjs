#!/usr/bin/env node
/**
 * check-env-sync.mjs
 *
 * Verifica sincronización de archivos .env:
 *  - En CI: .env.example vs Zod schema (source of truth)
 *  - Local: también compara .env vs .env.example
 *
 * En CI no existe .env (gitignored), se valida contra el schema.
 * Localmente se chequea que .env tenga las mismas vars que .env.example.
 *
 * Uso:
 *   node scripts/check-env-sync.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Helpers ─────────────────────────────────────────────────────────

function extractVars(content) {
  return new Set(
    [...content.matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map((m) => m[1]),
  );
}

// ── Leer .env.example ───────────────────────────────────────────────

const envExample = readFileSync(resolve(root, '.env.example'), 'utf-8');
const exampleVars = extractVars(envExample);

// ── Leer Zod schema ────────────────────────────────────────────────

const schemaPath = resolve(root, 'packages/shared/src/env.ts');
const schemaContent = readFileSync(schemaPath, 'utf-8');

const schemaVars = new Set(
  [...schemaContent.matchAll(/^\s+([A-Z_][A-Z0-9_]*):\s+z\./gm)].map((m) => m[1]),
);

// Identificar vars REQUIRED (sin default, sin .optional())
const requiredVars = [...schemaVars].filter((v) => {
  const line = schemaContent.split('\n').find((l) => l.trim().startsWith(v + ':'));
  return !line?.includes('.default(') && !line?.includes('.optional()');
});

// ── Validar .env.example vs Zod schema ──────────────────────────────

let errors = 0;

// 1. Toda var en .env.example debe existir en el schema
for (const v of exampleVars) {
  if (!schemaVars.has(v)) {
    console.error(`❌ "${v}" está en .env.example pero NO existe en el Zod schema`);
    errors++;
  }
}

// 2. Toda var REQUIRED del schema debe estar documentada en .env.example
for (const v of requiredVars) {
  if (!exampleVars.has(v)) {
    console.error(`❌ "${v}" es requerido en el Zod schema pero NO está en .env.example`);
    errors++;
  }
}

// ── Validar .env vs .env.example (solo local) ──────────────────────

const envPath = resolve(root, '.env');
const hasDotEnv = existsSync(envPath);

if (hasDotEnv) {
  const envContent = readFileSync(envPath, 'utf-8');
  const envVars = extractVars(envContent);

  // Vars en .env.example que faltan en .env
  for (const v of exampleVars) {
    if (!envVars.has(v)) {
      console.error(`❌ "${v}" está en .env.example pero falta en .env`);
      errors++;
    }
  }

  // Vars en .env que no están en .env.example (huérfanas)
  for (const v of envVars) {
    if (!exampleVars.has(v)) {
      console.error(`❌ "${v}" está en .env pero NO en .env.example (quizás obsoleta)`);
      errors++;
    }
  }
} else {
  console.log(`ℹ️  .env no encontrado (esperado en CI). Saltando validación local.`);
}

// ── Resumen ────────────────────────────────────────────────────────

if (errors > 0) {
  const what = hasDotEnv
    ? '.env, .env.example y schema'
    : '.env.example y schema';
  console.error(`\n🔥 ${errors} discrepancia(s) entre ${what}. Sincronizá los archivos.`);
  process.exit(1);
}

console.log(`✅ Archivos .env sincronizados`);
console.log(`   ${exampleVars.size} vars en .env.example`);
console.log(`   ${schemaVars.size} vars en schema (${requiredVars.length} requeridas)`);
if (hasDotEnv) {
  const envContent = readFileSync(envPath, 'utf-8');
  console.log(`   ${extractVars(envContent).size} vars en .env`);
}
