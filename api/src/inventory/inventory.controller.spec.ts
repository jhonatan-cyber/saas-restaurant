import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('InventoryController', () => {
  const serviceMock = {
    listMovements: jest.fn(),
    getKardex: jest.fn(),
    getLowStock: jest.fn(),
    adjustStock: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  describe('listMovements', () => {
    it('delegates to service with filters', async () => {
      serviceMock.listMovements.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(InventoryController, [
              { provide: InventoryService, useValue: serviceMock },
            ]);
      const filters = { page: 1, pageSize: 20 } as any;
      await ctrl.listMovements(mockUser, mockCtx, filters);
      expect(serviceMock.listMovements).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });
  });

  describe('getKardex', () => {
    it('delegates to service with productId and optional branchId', async () => {
      serviceMock.getKardex.mockResolvedValue([]);
      const ctrl = await buildControllerTest(InventoryController, [
              { provide: InventoryService, useValue: serviceMock },
            ]);
      await ctrl.getKardex(mockUser, mockCtx, 'prod-1', 'branch-1');
      expect(serviceMock.getKardex).toHaveBeenCalledWith(mockUser, mockCtx, 'prod-1', 'branch-1');
    });

    it('works without branchId', async () => {
      serviceMock.getKardex.mockResolvedValue([]);
      const ctrl = await buildControllerTest(InventoryController, [
              { provide: InventoryService, useValue: serviceMock },
            ]);
      await ctrl.getKardex(mockUser, mockCtx, 'prod-1', undefined);
      expect(serviceMock.getKardex).toHaveBeenCalledWith(mockUser, mockCtx, 'prod-1', undefined);
    });
  });

  describe('getLowStock', () => {
    it('delegates to service', async () => {
      serviceMock.getLowStock.mockResolvedValue([]);
      const ctrl = await buildControllerTest(InventoryController, [
              { provide: InventoryService, useValue: serviceMock },
            ]);
      await ctrl.getLowStock(mockUser, mockCtx, 'branch-1');
      expect(serviceMock.getLowStock).toHaveBeenCalledWith(mockUser, mockCtx, { branchId: 'branch-1' });
    });
  });

  describe('adjust', () => {
    it('delegates to service with dto', async () => {
      serviceMock.adjustStock.mockResolvedValue({ id: 'mov-1', productId: 'prod-1', quantity: '10', runningBalance: '60', type: 'IN' });
      const ctrl = await buildControllerTest(InventoryController, [
              { provide: InventoryService, useValue: serviceMock },
            ]);
      const dto = { productId: 'prod-1', branchId: 'branch-1', type: 'IN' as const, quantity: 10, reason: 'Ajuste por rotura de stock' };
      const result = await ctrl.adjust(mockUser, mockCtx, dto);
      expect(serviceMock.adjustStock).toHaveBeenCalledWith(mockUser, mockCtx, dto);
      expect(result).toEqual({ id: 'mov-1', productId: 'prod-1', quantity: '10', runningBalance: '60', type: 'IN' });
    });

    it('propagates service errors', async () => {
      const err = new Error('Producto no encontrado');
      serviceMock.adjustStock.mockRejectedValue(err);
      const ctrl = await buildControllerTest(InventoryController, [
              { provide: InventoryService, useValue: serviceMock },
            ]);
      const dto = { productId: 'bad-id', branchId: 'branch-1', type: 'IN' as const, quantity: 10, reason: 'Test' };
      await expect(ctrl.adjust(mockUser, mockCtx, dto)).rejects.toThrow(err);
    });
  });
});
