/**
 * Print Agent — Microservicio local de impresión térmica.
 *
 * Corre en la máquina local (localhost:3100 por defecto) y expone
 * endpoints HTTP para imprimir tickets, comandas y cierres de caja
 * en impresoras térmicas ESC/POS.
 *
 * Uso:
 *   bun run src/index.ts
 *   # Opcional: PRINT_AGENT_PORT=3100 bun run src/index.ts
 *   # Opcional: PRINTERS_JSON=ruta/al/archivo.json
 *
 * Configuración de impresoras vía JSON (printers.json en la raíz):
 *   [
 *     {
 *       "id": "ticket-printer",
 *       "name": "Impresora Ticket",
 *       "type": "network",
 *       "host": "192.168.1.100",
 *       "port": 9100,
 *       "tags": ["ticket", "close-report"]
 *     },
 *     {
 *       "id": "comanda-printer",
 *       "name": "Impresora Cocina",
 *       "type": "network",
 *       "host": "192.168.1.101",
 *       "port": 9100,
 *       "tags": ["comanda"]
 *     }
 *   ]
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { healthRoutes } from './routes/health';
import { printRoutes } from './routes/print';
import { setPrinters, type PrinterConfig } from './lib/printer';

// Cargar configuración de impresoras
const printersPath = resolve(import.meta.dir, '../printers.json');
if (existsSync(printersPath)) {
  const raw = readFileSync(printersPath, 'utf-8');
  const config: PrinterConfig[] = JSON.parse(raw);
  setPrinters(config);
  console.log(`🖨️  Impresoras cargadas: ${config.map((p) => p.name).join(', ')}`);
} else {
  setPrinters([
    {
      id: 'debug-file',
      name: 'Debug (archivo)',
      type: 'file',
      outputDir: resolve(import.meta.dir, '../prints'),
      tags: ['ticket', 'comanda', 'close-report'],
    },
  ]);
  console.log('⚠️  No se encontró printers.json. Usando output a archivo en prints/');
}

const app = new Hono();

app.use('/*', cors());

// Routes
app.route('/', healthRoutes);
app.route('/print', printRoutes);

const port = Number(process.env.PRINT_AGENT_PORT ?? 3100);

console.log(`\n🖨️  Print Agent v0.1.0`);
console.log(`   Servidor: http://localhost:${port}`);
console.log(`   Health:   http://localhost:${port}/health`);
console.log(`   Endpoints:`);
console.log(`     POST /print/ticket         — Ticket de venta`);
console.log(`     POST /print/comanda        — Comanda de cocina`);
console.log(`     POST /print/close-report   — Cierre de caja\n`);

export default {
  port,
  fetch: app.fetch,
};
