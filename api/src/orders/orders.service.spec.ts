import { OrdersService } from './orders.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { createTestUser, createTestContext, decimal } from '../test/mocks';
import { buildServiceTest, MockPrisma, MockAudit, MockCash, MockRealtime } from '../test/service-test.helper';
import { PrintService } from '../print/print.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: MockPrisma;
  let audit: MockAudit;
  let cash: MockCash;
  let realtime: MockRealtime;

  const user = createTestUser();
  const context = createTestContext();

  const baseProduct = {
    id: 'prod-1',
    name: 'Hamburguesa',
    price: decimal(100),
    taxRate: decimal(21),
    isAvailable: true,
    isActive: true,
    productType: 'DISH',
    preparationAreaId: 'area-1',
    preparationArea: { id: 'area-1', name: 'Cocina' },
    deletedAt: null,
  };

  const baseOrder = {
    id: 'order-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    tableId: null,
    customerId: null,
    cashierId: 'user-1',
    waiterId: null,
    type: 'DINE_IN',
    channel: 'POS_WEB',
    status: OrderStatus.PENDING,
    subtotal: decimal(100),
    taxTotal: decimal(21),
    total: decimal(121),
    discount: decimal(0),
    discountReason: null,
    globalNotes: null,
    cashRegisterId: 'cash-reg-1',
    shiftId: 'shift-1',
    version: 1,
    cancelledAt: null,
    cancelledByUserId: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const printServiceMock = {
    printComandaForOrder: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const result = await buildServiceTest(OrdersService, {
      audit: true,
      cashFoundation: true,
      realtime: true,
      quota: true,
      extra: [{ provide: PrintService, useValue: printServiceMock }],
    });
    service = result.service;
    prisma = result.prisma;
    audit = result.audit!;
    cash = result.cash!;
    realtime = result.realtime!;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================
  //  CREATE
  // =============================================================
  describe('create', () => {
    it('creates a PENDING order with items', async () => {
      const createDto = {
        items: [
          { productId: 'prod-1', quantity: 2, notes: 'Sin cebolla' },
        ],
        type: 'DINE_IN' as const,
        channel: 'POS_WEB' as const,
      };

      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.order.create.mockResolvedValue({
        ...baseOrder,
        items: [
          {
            id: 'item-1', orderId: 'order-1', productId: 'prod-1',
            productName: 'Hamburguesa', unitPrice: decimal(100),
            quantity: 2, lineTotal: decimal(200), taxRate: decimal(21),
            preparationAreaId: 'area-1', preparationAreaName: 'Cocina',
            notes: 'Sin cebolla', businessId: 'biz-1',
            createdAt: new Date(),
          },
        ],
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      const result = await service.create(user, context, createDto);

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(prisma.mockPrisma.product.findMany).toHaveBeenCalled();
      expect(audit!.log).toHaveBeenCalled();
      expect(realtime!.emitOrderCreated).toHaveBeenCalled();
    });

    it('throws ForbiddenException if no branchId in context', async () => {
      await expect(
        service.create(
          createTestUser({ defaultBranchId: undefined }),
          undefined,
          { items: [{ productId: 'prod-1', quantity: 1 }] },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnprocessableEntityException if no open cash/shift', async () => {
      cash!.findOpenCashAndShift.mockResolvedValue(null);

      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);

      await expect(
        service.create(user, context, {
          items: [{ productId: 'prod-1', quantity: 1 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws on invalid products', async () => {
      prisma.mockPrisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.create(user, context, {
          items: [{ productId: 'nonexistent', quantity: 1 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws on inactive products via addItem (loadProduct)', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce({
        ...baseProduct,
        isAvailable: false,
      });

      await expect(
        service.addItem(user, context, 'order-1', 'prod-1', 1),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('validates table ownership when tableId provided', async () => {
      const createDto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        tableId: 'table-1',
      };

      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(null);

      await expect(service.create(user, context, createDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('validates customer ownership when customerId provided', async () => {
      const createDto = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        customerId: 'cust-1',
      };

      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue({ id: 'table-1' });
      prisma.mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.create(user, context, createDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // =============================================================
  //  TRANSITION
  // =============================================================
  describe('transition', () => {
    it('transitions order status successfully', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);
      prisma.mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.SENT_TO_KITCHEN,
        version: 2,
        items: [],
      });

      const result = await service.transition(user, context, 'order-1', {
        to: OrderStatus.SENT_TO_KITCHEN,
      });

      expect(result.status).toBe(OrderStatus.SENT_TO_KITCHEN);
      expect(realtime!.emitOrderStateChanged).toHaveBeenCalled();
      expect(audit!.log).toHaveBeenCalled();
    });

    it('throws ConflictException on stale version', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        version: 2,
      });

      await expect(
        service.transition(user, context, 'order-1', {
          to: OrderStatus.SENT_TO_KITCHEN,
          expectedVersion: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws UnprocessableEntityException on invalid transition', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.transition(user, context, 'order-1', {
          to: OrderStatus.PAID,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException if order not found', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.transition(user, context, 'nonexistent', {
          to: OrderStatus.SENT_TO_KITCHEN,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =============================================================
  //  CANCEL
  // =============================================================
  describe('cancel', () => {
    it('cancels an active order', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByUserId: 'user-1',
        cancellationReason: 'Cliente no quiere esperar',
        items: [],
      });
      prisma.mockPrisma.order.count.mockResolvedValue(0);
      prisma.mockPrisma.restaurantTable.update.mockResolvedValue({} as any);

      const result = await service.cancel(user, context, 'order-1', {
        reason: 'Cliente no quiere esperar',
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(realtime!.emitOrderCancelled).toHaveBeenCalled();
      expect(audit!.log).toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException if order already PAID', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PAID,
      });

      await expect(
        service.cancel(user, context, 'order-1', { reason: 'test' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException if order already CANCELLED', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.cancel(user, context, 'order-1', { reason: 'test' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ConflictException on stale version', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        version: 2,
      });

      await expect(
        service.cancel(user, context, 'order-1', {
          reason: 'test',
          expectedVersion: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =============================================================
  //  QUERIES
  // =============================================================
  describe('list', () => {
    it('returns paginated orders', async () => {
      prisma.mockPrisma.order.count.mockResolvedValue(1);
      prisma.mockPrisma.order.findMany.mockResolvedValue([
        { ...baseOrder, _count: { items: 2 } },
      ]);

      const result = await service.list(user, context, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('getById', () => {
    it('returns order with items and logs', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        items: [],
        stateLogs: [],
      });

      const result = await service.getById(user, context, 'order-1');

      expect(result.id).toBe('order-1');
      expect(result.items).toBeDefined();
      expect(result.stateLogs).toBeDefined();
    });

    it('throws NotFoundException if not found', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =============================================================
  //  ITEMS (addItem, updateItem, removeItem)
  // =============================================================
  describe('addItem', () => {
    it('adds an item to an editable order', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce(baseProduct);
      const createdItem = {
        id: 'item-new', orderId: 'order-1', productId: 'prod-1',
        productName: 'Hamburguesa', unitPrice: decimal(100),
        quantity: 1, lineTotal: decimal(100), taxRate: decimal(21),
        preparationAreaId: 'area-1', preparationAreaName: 'Cocina',
        notes: null, businessId: 'biz-1', createdAt: new Date(),
      };
      prisma.mockPrisma.orderItem.create.mockResolvedValue(createdItem);
      prisma.mockTx.orderItem.create.mockResolvedValue(createdItem);
      prisma.mockTx.orderItem.findMany.mockResolvedValue([{
        unitPrice: decimal(100), quantity: 1, taxRate: decimal(21),
      }]);
      prisma.mockTx.order.update.mockResolvedValue({
        ...baseOrder,
        items: [createdItem],
      });
      const result = await service.addItem(user, context, 'order-1', 'prod-1', 1);

      expect(result.item.productName).toBe('Hamburguesa');
      expect(realtime!.emitOrderItemAdded).toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException if product not found', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.addItem(user, context, 'order-1', 'nonexistent', 1),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('updateItem', () => {
    it('updates item quantity', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValueOnce({
        id: 'item-1', orderId: 'order-1', productId: 'prod-1',
        quantity: 1, unitPrice: decimal(100), notes: null, businessId: 'biz-1', createdAt: new Date(),
      });
      prisma.mockPrisma.orderItem.update.mockResolvedValue({
        id: 'item-1', quantity: 3, lineTotal: decimal(300),
      } as any);
      prisma.mockTx.orderItem.update.mockResolvedValue({
        id: 'item-1', orderId: 'order-1', productId: 'prod-1',
        productName: 'Hamburguesa', unitPrice: decimal(100), taxRate: decimal(21),
        quantity: 3, lineTotal: decimal(300), notes: null,
        preparationAreaId: null, preparationAreaName: null,
        businessId: 'biz-1', createdAt: new Date(),
      } as any);
      prisma.mockTx.orderItem.findMany.mockResolvedValue([{
        unitPrice: decimal(100), quantity: 3, taxRate: decimal(21),
      }]);
      prisma.mockTx.order.update.mockResolvedValue({
        ...baseOrder,
        items: [{ id: 'item-1', productId: 'prod-1', quantity: 3 }],
      } as any);

      await service.updateItem(user, context, 'order-1', 'item-1', { quantity: 3 });

      expect(realtime!.emitOrderItemUpdated).toHaveBeenCalled();
    });

    it('throws NotFoundException if item not found', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateItem(user, context, 'order-1', 'item-1', { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('removes item from order', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValueOnce({
        id: 'item-1', orderId: 'order-1',
      });
      prisma.mockPrisma.orderItem.delete.mockResolvedValue({} as any);
      prisma.mockTx.orderItem.delete.mockResolvedValue({} as any);
      prisma.mockTx.orderItem.findMany.mockResolvedValue([]);
      prisma.mockTx.order.update.mockResolvedValue({
        ...baseOrder, items: [],
      } as any);
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, items: [],
      } as any);
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      const result = await service.removeItem(user, context, 'order-1', 'item-1');

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(realtime!.emitOrderItemRemoved).toHaveBeenCalled();
    });

    it('throws NotFoundException if item not in order', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.removeItem(user, context, 'order-1', 'item-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =============================================================
  //  KDS
  // =============================================================
  describe('kdsView', () => {
    it('returns orders with area filter', async () => {
      const kdsOrder = {
        ...baseOrder,
        status: OrderStatus.SENT_TO_KITCHEN,
        items: [{ preparationAreaId: 'area-1', preparationAreaName: 'Cocina' }],
        table: { number: '5' },
      };
      prisma.mockPrisma.order.findMany.mockResolvedValue([kdsOrder]);
      prisma.mockPrisma.preparationArea.findMany.mockResolvedValue([{
        id: 'area-1', businessId: 'biz-1', name: 'Cocina', code: 'COCINA',
        isActive: true, branchId: 'branch-1', displayOrder: 0, description: null,
      }]);

      const result = await service.kdsView(user, context, {
        branchId: 'branch-1',
        preparationAreaId: 'area-1',
      });

      expect(result.areas).toHaveLength(1);
      expect(result.areas[0]!.orders).toHaveLength(1);
    });
  });
});

// =============================================================
//  computeBulkPrice (module-level function)
// =============================================================
import { computeBulkPrice } from './orders.service';

describe('computeBulkPrice', () => {
  const basePrice = new Prisma.Decimal(100);

  it('returns basePrice when bulkPricing is null', () => {
    const result = computeBulkPrice(basePrice, 10, null);
    expect(result.equals(basePrice)).toBe(true);
  });

  it('returns basePrice when bulkPricing is undefined', () => {
    const result = computeBulkPrice(basePrice, 10, undefined);
    expect(result.equals(basePrice)).toBe(true);
  });

  it('returns basePrice when bulkPricing is empty array', () => {
    const result = computeBulkPrice(basePrice, 10, []);
    expect(result.equals(basePrice)).toBe(true);
  });

  it('returns basePrice when quantity is below minimum tier', () => {
    const tiers = [{ minQty: 5, unitPrice: 80 }];
    const result = computeBulkPrice(basePrice, 3, tiers);
    expect(result.equals(basePrice)).toBe(true);
  });

  it('returns tier unitPrice when quantity meets minimum tier', () => {
    const tiers = [{ minQty: 5, unitPrice: 80 }];
    const result = computeBulkPrice(basePrice, 5, tiers);
    expect(result.equals(new Prisma.Decimal(80))).toBe(true);
  });

  it('returns highest applicable tier when multiple tiers exist', () => {
    const tiers = [
      { minQty: 3, unitPrice: 90 },
      { minQty: 5, unitPrice: 80 },
      { minQty: 10, unitPrice: 70 },
    ];
    const result = computeBulkPrice(basePrice, 8, tiers);
    // At qty=8, the highest applicable tier is minQty=5 (unitPrice=80)
    expect(result.equals(new Prisma.Decimal(80))).toBe(true);
  });

  it('returns highest tier when quantity exceeds all tiers', () => {
    const tiers = [
      { minQty: 3, unitPrice: 90 },
      { minQty: 5, unitPrice: 80 },
    ];
    const result = computeBulkPrice(basePrice, 10, tiers);
    expect(result.equals(new Prisma.Decimal(80))).toBe(true);
  });

  it('returns basePrice when quantity is below all tiers', () => {
    const tiers = [
      { minQty: 5, unitPrice: 80 },
      { minQty: 10, unitPrice: 70 },
    ];
    const result = computeBulkPrice(basePrice, 2, tiers);
    expect(result.equals(basePrice)).toBe(true);
  });

  it('handles non-array bulkPricing gracefully', () => {
    const result = computeBulkPrice(basePrice, 10, { invalid: true } as any);
    expect(result.equals(basePrice)).toBe(true);
  });

  it('precisely returns tier price with decimals', () => {
    const tiers = [{ minQty: 5, unitPrice: 89.50 }];
    const result = computeBulkPrice(basePrice, 5, tiers);
    expect(result.equals(new Prisma.Decimal(89.50))).toBe(true);
  });
});
