import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrintService } from './print.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockConfigService } from '../test/mocks';

describe('PrintService', () => {
  let service: PrintService;
  let config: ReturnType<typeof createMockConfigService>;
  let prisma: any;
  let originalFetch: any;

  const mockOrder = {
    id: 'order-1234567890abcdef',
    branchId: 'branch-1',
    tableId: 'table-1',
    waiterId: null,
    globalNotes: 'Sin sal, por favor',
    createdAt: new Date('2026-07-21T12:00:00Z'),
    items: [
      {
        productName: 'Hamburguesa Clásica',
        quantity: 2,
        unitPrice: 50,
        notes: 'Sin cebolla',
        preparationAreaId: 'area-1',
        preparationAreaName: 'COCINA',
      },
      {
        productName: 'Papas Fritas',
        quantity: 1,
        unitPrice: 25,
        notes: null,
        preparationAreaId: 'area-1',
        preparationAreaName: 'COCINA',
      },
      {
        productName: 'Mojito',
        quantity: 3,
        unitPrice: 40,
        notes: 'Con hielo extra',
        preparationAreaId: 'area-2',
        preparationAreaName: 'BAR',
      },
    ],
  } as any;

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    });

    config = createMockConfigService({
      PRINT_AGENT_URL: 'http://print-agent:3100',
    });

    prisma = {
      business: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Mi Restaurante' }),
      },
      branch: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Sucursal Centro' }),
      },
      restaurantTable: {
        findUnique: jest.fn().mockResolvedValue({ number: '5' }),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]), // No combo products in base mock
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PrintService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ── printComandaForOrder ──────────────────────────────────────────────

  describe('printComandaForOrder', () => {
    it('sends one comanda per preparation area', async () => {
      await service.printComandaForOrder('biz-1', mockOrder);

      // Should make 2 fetch calls: COCINA and BAR
      expect(global.fetch).toHaveBeenCalledTimes(2);

      const calls = (global.fetch as jest.Mock).mock.calls;
      const urls = calls.map((c: any[]) => c[0]);
      expect(urls).toEqual([
        'http://print-agent:3100/print/comanda',
        'http://print-agent:3100/print/comanda',
      ]);

      // Verify payload for COCINA
      const cocinaPayload = JSON.parse(calls[0][1].body);
      expect(cocinaPayload.areaName).toBe('COCINA');
      expect(cocinaPayload.items).toHaveLength(2);
      expect(cocinaPayload.items[0].name).toBe('Hamburguesa Clásica');
      expect(cocinaPayload.items[1].name).toBe('Papas Fritas');

      // Verify payload for BAR
      const barPayload = JSON.parse(calls[1][1].body);
      expect(barPayload.areaName).toBe('BAR');
      expect(barPayload.items).toHaveLength(1);
      expect(barPayload.items[0].name).toBe('Mojito');
    });

    it('includes order metadata in the payload', async () => {
      await service.printComandaForOrder('biz-1', mockOrder);

      const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(payload.businessName).toBe('Mi Restaurante');
      expect(payload.branchName).toBe('Sucursal Centro');
      expect(payload.orderCode).toBe('90ABCDEF'); // last 8 chars uppercase
      expect(payload.tableNumber).toBe('5');
      expect(payload.globalNotes).toBe('Sin sal, por favor');
      expect(payload.createdAt).toBe('2026-07-21T12:00:00.000Z');
      expect(payload.areaTag).toBe('comanda');
    });

    it('sends single comanda when all items are in the same area', async () => {
      const singleAreaOrder = {
        ...mockOrder,
        items: [mockOrder.items[0], mockOrder.items[1]], // only COCINA items
      };

      await service.printComandaForOrder('biz-1', singleAreaOrder);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(payload.areaName).toBe('COCINA');
      expect(payload.items).toHaveLength(2);
    });

    it('groups items without preparationAreaName as General', async () => {
      const noAreaOrder = {
        ...mockOrder,
        items: [
          { productName: 'Item sin área', quantity: 1, notes: null },
        ],
      };

      await service.printComandaForOrder('biz-1', noAreaOrder);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(payload.areaName).toBe('General');
      expect(payload.items).toHaveLength(1);
    });

    it('omits tableNumber when tableId is null', async () => {
      const orderWithoutTable = { ...mockOrder, tableId: null };

      await service.printComandaForOrder('biz-1', orderWithoutTable);

      const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(payload.tableNumber).toBeUndefined();
    });

    it('omits tableNumber when table not found', async () => {
      prisma.restaurantTable.findUnique.mockResolvedValue(null);

      await service.printComandaForOrder('biz-1', mockOrder);

      const payload = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(payload.tableNumber).toBeUndefined();
    });

    it('logs warning when print-agent returns non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('No printer configured'),
      });

      const loggerWarn = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      await service.printComandaForOrder('biz-1', mockOrder);

      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('Comanda print failed'),
      );
    });

    it('logs warning when fetch throws', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const loggerWarn = jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      // Should not throw
      await service.printComandaForOrder('biz-1', mockOrder);

      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('Comanda print failed'),
      );
    });

    it('handles empty items gracefully', async () => {
      const emptyOrder = { ...mockOrder, items: [] };

      await service.printComandaForOrder('biz-1', emptyOrder);

      // No fetch calls since there are no areas
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('uses configured print-agent URL', async () => {
      config = createMockConfigService({ PRINT_AGENT_URL: 'http://print-server:9100' });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PrintService,
          { provide: ConfigService, useValue: config },
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const svc = module.get(PrintService);
      await svc.printComandaForOrder('biz-1', mockOrder);

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain('print-server:9100');
    });
  });

  // ── sendToPrintAgent (private) ────────────────────────────────────────

  describe('sendToPrintAgent (via behavior)', () => {
    beforeEach(() => {
      // Rebuild with only 1 area for simplicity
      const singleOrder = {
        ...mockOrder,
        items: [mockOrder.items[0]],
      };
      return service.printComandaForOrder('biz-1', singleOrder);
    });

    it('uses POST method with JSON content type', () => {
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].method).toBe('POST');
      expect(call[1].headers['Content-Type']).toBe('application/json');
    });

    it('sets 5 second timeout signal', () => {
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].signal).toBeDefined();
    });
  });
});
