import { describe, it, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { printRoutes } from './print';
import { setPrinters } from '../lib/printer';

const app = new Hono();
app.route('/print', printRoutes);

beforeAll(() => {
  setPrinters([
    { id: 'test-file', name: 'Test File', type: 'file', outputDir: '/tmp', tags: ['ticket', 'comanda', 'close-report'] },
  ]);
});

describe('POST /print/ticket', () => {
  it('returns 200 with valid ticket data', async () => {
    const res = await app.request('/print/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Test Restaurant',
        branchName: 'Centro',
        orderCode: 'TEST-001',
        cashierName: 'Admin',
        items: [{ name: 'Hamburguesa', qty: 1, total: '50.00' }],
        subtotal: '50.00',
        taxTotal: '5.75',
        total: '55.75',
        payments: [{ method: 'Efectivo', amount: '55.75' }],
        createdAt: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.results)).toBe(true);
  });
});

describe('POST /print/comanda', () => {
  it('returns 200 with valid comanda data', async () => {
    const res = await app.request('/print/comanda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Test Restaurant',
        branchName: 'Centro',
        orderCode: 'TEST-001',
        areaName: 'COCINA',
        items: [{ name: 'Pizza', qty: 2, notes: 'Sin cebolla' }],
        createdAt: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
