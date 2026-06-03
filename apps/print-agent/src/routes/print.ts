import { Hono } from 'hono';
import { buildTicket } from '../templates/ticket';
import { buildComanda } from '../templates/comanda';
import { buildCloseReport } from '../templates/close-report';
import { findPrintersByTag, printToPrinter, type PrintResult } from '../lib/printer';

const printRoutes = new Hono();

// ==================== POST /print/ticket ====================

printRoutes.post('/ticket', async (c) => {
  const body = await c.req.json<any>();

  const printers = findPrintersByTag('ticket');
  if (printers.length === 0) {
    return c.json({ ok: false, error: 'No hay impresora configurada para tickets' }, 400);
  }

  const data = buildTicket(body);
  const results: PrintResult[] = await Promise.all(
    printers.map((p) => printToPrinter(p, data, `ticket-${body.orderCode}`)),
  );

  return c.json({ ok: true, results }, 202);
});

// ==================== POST /print/comanda ====================

printRoutes.post('/comanda', async (c) => {
  const body = await c.req.json<any>();

  // Buscamos impresoras que tengan tag "comanda" o el area específica
  const printers = findPrintersByTag(body.areaTag ?? 'comanda');
  if (printers.length === 0) {
    return c.json({ ok: false, error: 'No hay impresora configurada para comandas' }, 400);
  }

  const data = buildComanda(body);
  const results: PrintResult[] = await Promise.all(
    printers.map((p) => printToPrinter(p, data, `comanda-${body.orderCode}`)),
  );

  return c.json({ ok: true, results }, 202);
});

// ==================== POST /print/close-report ====================

printRoutes.post('/close-report', async (c) => {
  const body = await c.req.json<any>();

  const printers = findPrintersByTag('close-report');
  if (printers.length === 0) {
    return c.json({ ok: false, error: 'No hay impresora configurada para cierres' }, 400);
  }

  const data = buildCloseReport(body);
  const results: PrintResult[] = await Promise.all(
    printers.map((p) => printToPrinter(p, data, `close-${body.branchName}`)),
  );

  return c.json({ ok: true, results }, 202);
});

export { printRoutes };
