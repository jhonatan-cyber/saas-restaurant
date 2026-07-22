import { Hono } from 'hono';
import { getPrinters } from '../lib/printer';

const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  const printers = getPrinters();
  return c.json({
    status: 'ok',
    version: '0.1.0',
    printers: printers.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      tags: p.tags,
    })),
  });
});

export { healthRoutes };
