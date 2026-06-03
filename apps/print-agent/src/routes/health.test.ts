import { describe, it, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { healthRoutes } from './health';
import { setPrinters } from '../lib/printer';

const app = new Hono();
app.route('/', healthRoutes);

describe('GET /health', () => {
  beforeAll(() => {
    setPrinters([
      { id: 'test-printer', name: 'Test Printer', type: 'file', outputDir: '/tmp', tags: ['ticket'] },
    ]);
  });

  it('returns 200 with status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
  });

  it('returns printers array', async () => {
    const res = await app.request('/health');
    const body = await res.json();

    expect(Array.isArray(body.printers)).toBe(true);
    expect(body.printers.length).toBeGreaterThan(0);

    const printer = body.printers[0];
    expect(printer).toHaveProperty('id');
    expect(printer).toHaveProperty('name');
    expect(printer).toHaveProperty('type');
    expect(printer).toHaveProperty('tags');
  });
});
