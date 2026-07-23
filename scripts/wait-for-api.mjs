/**
 * Script: wait-for-api.mjs
 *
 * Espera a que el API (NestJS) esté listo antes de iniciar la App/Admin.
 * Usa Node.js nativo (http.get) en lugar de curl para ser cross-platform.
 *
 * Uso: bun run scripts/wait-for-api.mjs
 */
import { get } from 'node:http';

const API_URL = process.env.API_HEALTH_URL || 'http://localhost:3001/api/admin/auth/me';
const MAX_RETRIES = 60;
const INTERVAL_MS = 1000;

function checkApi() {
  return new Promise((resolve) => {
    const req = get(API_URL, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

let ready = false;

for (let i = 0; i < MAX_RETRIES; i++) {
  ready = await checkApi();
  if (ready) break;

  if (i === 0) {
    console.log('⏳ Esperando a que el API esté listo...');
  }

  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}

if (!ready) {
  console.error('❌ El API no respondió después de ' + MAX_RETRIES + ' intentos.');
  console.error('   Asegúrate de que MySQL y Redis estén corriendo.');
  process.exit(1);
}

console.log('✅ API listo en ' + API_URL);
