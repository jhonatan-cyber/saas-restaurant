import { InventoryService } from './inventory.service';
import { NotFoundException } from '@nestjs/common';
import { createTestUser, createTestContext, decimal } from '../test/mocks';
import { buildServiceTest, MockPrisma } from '../test/service-test.helper';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: MockPrisma;

  const user = createTestUser();
  const context = createTestContext();

  const baseProduct = {
    id: 'prod-1', name: 'Harina', sku: 'HAR-001',
    currentStock: decimal(50),
  };
  const baseMovement = {
    id: 'mov-1', businessId: 'biz-1', branchId: 'branch-1',
    productId: 'prod-1', type: 'IN' as const, referenceType: 'PURCHASE' as const,
    referenceId: 'purch-1', quantity: decimal(10), unitCost: decimal(5),
    totalCost: decimal(50), runningBalance: decimal(60), notes: null,
    createdAt: new Date('2025-01-01'),
    product: { id: 'prod-1', name: 'Harina' },
  };

  beforeEach(async () => {
    const result = await buildServiceTest(InventoryService);
    service = result.service;
    prisma = result.prisma;
  });

  afterEach(() => jest.clearAllMocks());

  describe('getKardex', () => {
    it('returns kardex for a product in a branch', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(baseProduct);
      prisma.mockPrisma.inventoryMovement.findMany.mockResolvedValue([baseMovement]);

      const result = await service.getKardex(user, context, 'prod-1', 'branch-1');

      expect(result.productName).toBe('Harina');
      expect(result.movements).toHaveLength(1);
      expect(result.currentStock).toBe('50');
    });

    it('throws NotFoundException if no branchId provided', async () => {
      await expect(
        service.getKardex(user, { businessId: 'biz-1', branchId: 'branch-1' }, 'prod-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if product not found', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.getKardex(user, context, 'prod-1', 'branch-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLowStock', () => {
    it('returns products where currentStock <= minStock', async () => {
      prisma.mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Prod A', sku: 'A', currentStock: decimal(2), minStock: 5 },
        { id: 'p2', name: 'Prod B', sku: 'B', currentStock: decimal(10), minStock: 5 },
        { id: 'p3', name: 'Prod C', sku: 'C', currentStock: decimal(3), minStock: 3 },
      ]);

      const result = await service.getLowStock(user, context);

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('Prod A');
      expect(result[1]!.name).toBe('Prod C');
    });

    it('filters by branchId', async () => {
      prisma.mockPrisma.product.findMany.mockResolvedValue([]);
      await service.getLowStock(user, context, { branchId: 'branch-1' });

      expect(prisma.mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branchId: 'branch-1' }),
        }),
      );
    });

    it('returns empty array when no tracked products', async () => {
      prisma.mockPrisma.product.findMany.mockResolvedValue([]);
      const result = await service.getLowStock(user, context);
      expect(result).toEqual([]);
    });
  });

  describe('adjustStock', () => {
    it('creates IN movement and updates product stock', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1', trackStock: true, currentStock: decimal(50),
      });
      prisma.mockTx.inventoryMovement.create.mockResolvedValue({
        id: 'mov-1', productId: 'prod-1', quantity: decimal(10),
        runningBalance: decimal(60), type: 'IN',
      } as any);
      prisma.mockTx.product.update.mockResolvedValue({} as any);

      const result = await service.adjustStock(user, context, {
        productId: 'prod-1', branchId: 'branch-1',
        type: 'IN', quantity: 10, reason: 'Reposición',
      });

      expect(result.type).toBe('IN');
      expect(result.runningBalance).toBe('60');
      expect(prisma.mockTx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1', type: 'IN',
            referenceType: 'ADJUSTMENT',
            quantity: decimal(10),
            notes: 'Ajuste manual: Reposición',
          }),
        }),
      );
      expect(prisma.mockTx.product.update).toHaveBeenCalled();
    });

    it('creates OUT movement with negative quantity', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1', trackStock: true, currentStock: decimal(50),
      });
      prisma.mockTx.inventoryMovement.create.mockResolvedValue({
        id: 'mov-2', productId: 'prod-1', quantity: decimal(-5),
        runningBalance: decimal(45), type: 'OUT',
      } as any);
      prisma.mockTx.product.update.mockResolvedValue({} as any);

      const result = await service.adjustStock(user, context, {
        productId: 'prod-1', branchId: 'branch-1',
        type: 'OUT', quantity: 5, reason: 'Merma detectada',
      });

      expect(result.type).toBe('OUT');
      expect(prisma.mockTx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'OUT',
            quantity: decimal(-5),
          }),
        }),
      );
    });

    it('throws NotFoundException if product not found', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustStock(user, context, {
          productId: 'bad-id', branchId: 'branch-1',
          type: 'IN', quantity: 10, reason: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMovements', () => {
    it('returns paginated movements', async () => {
      prisma.mockPrisma.inventoryMovement.count.mockResolvedValue(1);
      prisma.mockPrisma.inventoryMovement.findMany.mockResolvedValue([baseMovement]);

      const result = await service.listMovements(user, context, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]!.productName).toBe('Harina');
    });

    it('filters by branchId and productId', async () => {
      prisma.mockPrisma.inventoryMovement.count.mockResolvedValue(0);
      prisma.mockPrisma.inventoryMovement.findMany.mockResolvedValue([]);

      await service.listMovements(user, context, { branchId: 'branch-1', productId: 'prod-1', page: 1, pageSize: 20 });

      const where = prisma.mockPrisma.inventoryMovement.findMany.mock.calls[0][0].where;
      expect(where.branchId).toBe('branch-1');
      expect(where.productId).toBe('prod-1');
    });
  });
});
