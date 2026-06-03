import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashFoundationService } from '../cash-foundation/cash-foundation.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  createMockPrisma,
  createMockAudit,
  createMockCashFoundation,
  createMockRealtime,
  createTestUser,
  createTestContext,
  decimal,
} from '../test/mocks';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let audit: ReturnType<typeof createMockAudit>;
  let cash: ReturnType<typeof createMockCashFoundation>;
  let realtime: ReturnType<typeof createMockRealtime>;

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

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();
    cash = createMockCashFoundation();
    realtime = createMockRealtime();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: AuditService, useValue: audit },
        { provide: CashFoundationService, useValue: cash },
        { provide: RealtimeGateway, useValue: realtime },
      ],
    }).compile();

    service = module.get(OrdersService);
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
      expect(audit.log).toHaveBeenCalled();
      expect(realtime.emitOrderCreated).toHaveBeenCalled();
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
      cash.findOpenCashAndShift.mockResolvedValue(null);

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
      // loadEditableOrder → loadOrder → one order.findFirst call
      prisma.mockPrisma.order.findFirst.mockResolvedValueOnce(baseOrder);
      // loadProduct returns inactive product
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
      // Inside $transaction, `findUnique` returns the order
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
      expect(realtime.emitOrderStateChanged).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
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
          to: OrderStatus.PAID, // can't go from PENDING to PAID
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
      prisma.mockPrisma.order.count.mockResolvedValue(0); // maybeReleaseTableInTx
      prisma.mockPrisma.restaurantTable.update.mockResolvedValue({} as any);

      const result = await service.cancel(user, context, 'order-1', {
        reason: 'Cliente no quiere esperar',
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(realtime.emitOrderCancelled).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
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

  describe('getLogs', () => {
    it('returns state logs for an order', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1' } as any);
      prisma.mockPrisma.orderStateLog.findMany.mockResolvedValue([
        { id: 'log-1', fromStatus: 'PENDING', toStatus: 'SENT_TO_KITCHEN' },
      ]);

      const result = await service.getLogs(user, context, 'order-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('log-1');
    });

    it('throws NotFoundException if order not found', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(service.getLogs(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =============================================================
  //  ITEMS
  // =============================================================
  describe('addItem', () => {
    it('adds an item to a PENDING order', async () => {
      prisma.mockPrisma.order.findFirst
        .mockResolvedValueOnce(baseOrder) // loadEditableOrder
        .mockResolvedValueOnce(baseOrder); // loadOrder
      prisma.mockPrisma.product.findFirst.mockResolvedValue(baseProduct);
      prisma.mockPrisma.orderItem.create.mockResolvedValue({
        id: 'item-2', orderId: 'order-1', productId: 'prod-1',
        productName: 'Hamburguesa', unitPrice: decimal(100),
        quantity: 1, lineTotal: decimal(100), taxRate: null,
        preparationAreaId: 'area-1', preparationAreaName: 'Cocina',
        notes: null, businessId: 'biz-1', createdAt: new Date(),
      });
      prisma.mockPrisma.orderItem.findMany.mockResolvedValue([]); // recalculate
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, items: [],
      });

      const result = await service.addItem(user, context, 'order-1', 'prod-1', 1);

      expect(result.item.productName).toBe('Hamburguesa');
      expect(realtime.emitOrderItemAdded).toHaveBeenCalled();
    });

    it('throws if order not editable', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.SENT_TO_KITCHEN,
      });

      await expect(
        service.addItem(user, context, 'order-1', 'prod-1', 1),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('updateItem', () => {
    it('updates an item quantity', async () => {
      prisma.mockPrisma.order.findFirst
        .mockResolvedValueOnce(baseOrder) // loadEditableOrder
        .mockResolvedValueOnce(baseOrder); // loadOrder
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValue({
        id: 'item-1', orderId: 'order-1', productId: 'prod-1',
        productName: 'Hamburguesa', unitPrice: decimal(100),
        quantity: 1, lineTotal: decimal(100), taxRate: decimal(21),
        notes: null, businessId: 'biz-1', createdAt: new Date(),
      });
      prisma.mockPrisma.orderItem.update.mockResolvedValue({
        id: 'item-1', orderId: 'order-1', businessId: 'biz-1',
        productId: 'prod-1', productName: 'Hamburguesa',
        unitPrice: decimal(100), quantity: 3, lineTotal: decimal(300),
        taxRate: decimal(21), notes: null,
        preparationAreaId: 'area-1', preparationAreaName: 'Cocina',
        createdAt: new Date(),
      });
      prisma.mockPrisma.orderItem.findMany.mockResolvedValue([]);
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, items: [],
      });

      const result = await service.updateItem(user, context, 'order-1', 'item-1', {
        quantity: 3,
      });

      expect(result.order).toBeDefined();
      expect(realtime.emitOrderItemUpdated).toHaveBeenCalled();
    });

    it('throws NotFoundException if item not found', async () => {
      prisma.mockPrisma.order.findFirst
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem(user, context, 'order-1', 'nonexistent', { quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('removes an item from a PENDING order', async () => {
      prisma.mockPrisma.order.findFirst
        .mockResolvedValueOnce(baseOrder) // loadEditableOrder
        .mockResolvedValueOnce(baseOrder); // loadOrder
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValue({
        id: 'item-1', orderId: 'order-1', businessId: 'biz-1',
      });
      prisma.mockPrisma.orderItem.delete.mockResolvedValue({} as any);
      prisma.mockPrisma.orderItem.findMany.mockResolvedValue([]);
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, items: [],
      });

      const result = await service.removeItem(user, context, 'order-1', 'item-1');

      expect(result.id).toBe('order-1');
      expect(realtime.emitOrderItemRemoved).toHaveBeenCalled();
    });

    it('throws NotFoundException if item not found', async () => {
      prisma.mockPrisma.order.findFirst
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce(baseOrder);
      prisma.mockPrisma.orderItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem(user, context, 'order-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =============================================================
  //  KDS VIEW
  // =============================================================
  describe('kdsView', () => {
    it('returns orders grouped by preparation area', async () => {
      prisma.mockPrisma.preparationArea.findMany.mockResolvedValue([
        { id: 'area-1', name: 'Cocina', code: 'KITCHEN', displayOrder: 1, isActive: true, businessId: 'biz-1', branchId: 'branch-1', createdAt: new Date(), updatedAt: new Date() },
      ]);
      prisma.mockPrisma.order.findMany.mockResolvedValue([
        {
          ...baseOrder,
          status: OrderStatus.SENT_TO_KITCHEN,
          items: [
            {
              id: 'item-1', productName: 'Hamburguesa', quantity: 2,
              notes: null, preparationAreaId: 'area-1',
              preparationAreaName: 'Cocina',
            },
          ],
          table: { number: '5' },
          _count: undefined,
        },
      ]);

      const result = await service.kdsView(user, context, {});

      expect(result.areas).toHaveLength(1);
      expect(result.areas[0].orders).toHaveLength(1);
      expect(result.areas[0].orders[0].tableNumber).toBe('5');
    });

    it('throws ForbiddenException if no branchId', async () => {
      await expect(
        service.kdsView(
          createTestUser({ defaultBranchId: undefined }),
          undefined,
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
