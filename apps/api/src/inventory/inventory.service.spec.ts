import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createTestUser,
  createTestContext,
  decimal,
} from '../test/mocks';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: ReturnType<typeof createMockPrisma>;

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
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
      ],
    }).compile();
    service = module.get(InventoryService);
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
