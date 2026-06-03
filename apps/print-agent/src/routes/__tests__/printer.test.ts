import { describe, it, expect, beforeAll } from 'bun:test';
import { setPrinters, getPrinters, findPrintersByTag, type PrinterConfig } from '../../lib/printer';

const mockPrinters: PrinterConfig[] = [
  { id: 'p1', name: 'Ticket', type: 'file', outputDir: '/tmp', tags: ['ticket'] },
  { id: 'p2', name: 'Cocina', type: 'file', outputDir: '/tmp', tags: ['comanda'] },
  { id: 'p3', name: 'General', type: 'file', outputDir: '/tmp', tags: ['ticket', 'comanda'] },
];

describe('Printer lib', () => {
  beforeAll(() => {
    setPrinters(mockPrinters);
  });

  it('getPrinters returns all configured printers', () => {
    const printers = getPrinters();
    expect(printers).toHaveLength(3);
  });

  it('findPrintersByTag filters by tag', () => {
    const ticketPrinters = findPrintersByTag('ticket');
    expect(ticketPrinters).toHaveLength(2);
    expect(ticketPrinters.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('findPrintersByTag returns empty array for unknown tag', () => {
    const printers = findPrintersByTag('nonexistent');
    expect(printers).toHaveLength(0);
  });
});
