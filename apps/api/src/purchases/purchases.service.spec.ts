import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createTestUser,
  createTestContext,
  decimal,
} from '../test/mocks';
import type { CreatePurchaseDto, UpdatePurchaseDto } from './dto/purchase.dto';

describe('PurchasesService', () => {
  let service: PurchasesService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const user = createTestUser();
  const context = createTestContext();

  const baseSupplier = {
    id: 'supp-1', businessId: 'biz-1', name: 'Distribuidora ABC',
    contactName: null, email: null, phone: null, address: null,
    taxId: null, notes: null, isActive: true, branchId: null,
    deletedAt: null,
    createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-01'),
    _count: { purchases: 0 },
  };
  const baseProduct = { id: 'prod-1', name: 'Harina', cost: decimal(5) };
  const basePurchase = {
    id: 'purch-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    supplierId: 'supp-1',
    purchaseNumber: 'OC-001',
    status: 'PENDING' as const,
    subtotal: decimal(100),
    taxTotal: decimal(21),
    total: decimal(121),
    notes: null,
    createdById: 'user-1',
    receivedAt: null,
    receivedBy: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    supplier: baseSupplier,
    items: [
      {
        id: 'item-1',
        purchaseId: 'purch-1',
        productId: 'prod-1', productName: 'Harina',
        unitCost: decimal(5), quantity: decimal(20), lineTotal: decimal(100),
        businessId: 'biz-1', createdAt: new Date('2025-01-01'),
      },
    ],
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
      ],
    }).compile();
    service = module.get(PurchasesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns paginated purchases with filters', async () => {
      prisma.mockPrisma.purchase.count.mockResolvedValue(1);
      prisma.mockPrisma.purchase.findMany.mockResolvedValue([basePurchase]);

      const result = await service.list(user, context, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by status, supplierId, branchId, search', async () => {
      prisma.mockPrisma.purchase.count.mockResolvedValue(0);
      prisma.mockPrisma.purchase.findMany.mockResolvedValue([]);

      await service.list(user, context, {
        status: 'PENDING',
        supplierId: 'supp-1',
        branchId: 'branch-1',
        search: 'OC-001',
        page: 1,
        pageSize: 20,
      });

      const where = prisma.mockPrisma.purchase.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('PENDING');
      expect(where.supplierId).toBe('supp-1');
      expect(where.branchId).toBe('branch-1');
      expect(where.purchaseNumber).toEqual({ contains: 'OC-001' });
    });

    it('filters by date range', async () => {
      prisma.mockPrisma.purchase.count.mockResolvedValue(0);
      prisma.mockPrisma.purchase.findMany.mockResolvedValue([]);

      await service.list(user, context, {
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
        page: 1,
        pageSize: 20,
      });

      const where = prisma.mockPrisma.purchase.findMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toBeInstanceOf(Date);
      expect(where.createdAt.lte).toBeInstanceOf(Date);
    });
  });

  describe('getById', () => {
    it('returns purchase when found', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(basePurchase);

      const result = await service.getById(user, context, 'purch-1');

      expect(result.id).toBe('purch-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(null);
      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreatePurchaseDto = {
      branchId: 'branch-1',
      purchaseNumber: 'OC-002',
      items: [{ productId: 'prod-1', quantity: 20, unitCost: 5 }],
      taxTotal: 0,
    };

    it('creates a purchase with calculated totals', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);
      prisma.mockPrisma.purchase.create.mockResolvedValue(basePurchase);

      const result = await service.create(user, context, createDto);

      expect(result.id).toBe('purch-1');
      expect(prisma.mockPrisma.purchase.create).toHaveBeenCalled();
    });

    it('throws ConflictException when purchaseNumber already exists', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(user, context, createDto)).rejects.toThrow(ConflictException);
      expect(prisma.mockPrisma.purchase.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when a product does not exist', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.product.findMany.mockResolvedValue([]); // empty = no products found

      await expect(service.create(user, context, createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates purchase fields', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(basePurchase);
      prisma.mockPrisma.purchase.update.mockResolvedValue({
        ...basePurchase, notes: 'Actualizado',
      });

      const result = await service.update(user, context, 'purch-1', {
        notes: 'Actualizado',
      });

      expect(result).toBeDefined();
    });

    it('throws if purchase is not PENDING', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue({
        ...basePurchase, status: 'COMPLETED',
      });

      await expect(
        service.update(user, context, 'purch-1', { notes: 'test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(null);
      await expect(
        service.update(user, context, 'nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('complete', () => {
    it('completes a purchase and creates inventory movements', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(basePurchase);
      prisma.mockPrisma.purchase.update.mockResolvedValue({
        ...basePurchase,
        status: 'COMPLETED',
        receivedAt: new Date(),
        receivedBy: 'user-1',
      });
      prisma.mockPrisma.inventoryMovement.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.inventoryMovement.create.mockResolvedValue({} as any);
      prisma.mockPrisma.product.update.mockResolvedValue({} as any);
      prisma.mockPrisma.purchase.findUnique.mockResolvedValue(basePurchase);

      const result = await service.complete(user, context, 'purch-1');

      expect(result).toBeDefined();
      expect(prisma.mockPrisma.purchase.update).toHaveBeenCalled();
    });

    it('throws if purchase not PENDING', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue({
        ...basePurchase, status: 'COMPLETED',
      });

      await expect(service.complete(user, context, 'purch-1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(null);
      await expect(service.complete(user, context, 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('accepts custom receivedAt date', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(basePurchase);
      prisma.mockPrisma.purchase.update.mockResolvedValue({ ...basePurchase, status: 'COMPLETED' } as any);
      prisma.mockPrisma.inventoryMovement.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.inventoryMovement.create.mockResolvedValue({} as any);
      prisma.mockPrisma.product.update.mockResolvedValue({} as any);
      prisma.mockPrisma.purchase.findUnique.mockResolvedValue(basePurchase);

      await service.complete(user, context, 'purch-1', '2025-03-01');

      const updateData = prisma.mockPrisma.purchase.update.mock.calls[0][0];
      expect(updateData.data.receivedAt).toBeInstanceOf(Date);
    });
  });

  describe('cancel', () => {
    it('cancels a PENDING purchase', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(basePurchase);
      prisma.mockPrisma.purchase.update.mockResolvedValue({
        ...basePurchase, status: 'CANCELLED',
      });

      const result = await service.cancel(user, context, 'purch-1');

      expect(result).toBeDefined();
      expect(prisma.mockPrisma.purchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED' },
        }),
      );
    });

    it('throws if not PENDING', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue({
        ...basePurchase, status: 'COMPLETED',
      });

      await expect(service.cancel(user, context, 'purch-1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.purchase.findFirst.mockResolvedValue(null);
      await expect(service.cancel(user, context, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
