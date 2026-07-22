import { OrderStatus } from '@saas/shared';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { mockUser, buildControllerTest } from '../test/controller-test.helper';
import { decimal } from '../test/mocks';

describe('OrdersController', () => {
  const serviceMock = {
    kdsView: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    transition: jest.fn(),
    cancel: jest.fn(),
    getLogs: jest.fn(),
  };
  const serverError = new Error('Server error');
  const ctx = { branchId: 'branch-1', businessId: 'biz-1' } as any;

  function makeOrder(overrides = {}) {
    return {
      id: 'order-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      status: OrderStatus.PENDING,
      subtotal: decimal(100),
      taxTotal: decimal(21),
      total: decimal(121),
      version: 1,
      items: [],
      stateLogs: [],
      tableId: null,
      customerId: null,
      cashierId: 'user-1',
      waiterId: null,
      type: 'DINE_IN' as const,
      channel: 'POS_WEB' as const,
      globalNotes: null,
      cashRegisterId: 'cash-reg-1',
      shiftId: 'shift-1',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      cancelledAt: null,
      cancelledByUserId: null,
      cancellationReason: null,
      ...overrides,
    };
  }

  function makeItem(overrides = {}) {
    return {
      id: 'item-1',
      orderId: 'order-1',
      productId: 'prod-1',
      productName: 'Hamburguesa',
      unitPrice: decimal(100),
      quantity: 2,
      lineTotal: decimal(200),
      taxRate: decimal(21),
      preparationAreaId: 'area-1',
      preparationAreaName: 'Cocina',
      notes: null,
      businessId: 'biz-1',
      createdAt: new Date('2025-01-01'),
      ...overrides,
    };
  }

  beforeEach(() => { jest.clearAllMocks(); });

  // ═════════════════════════════════════════════════════════════════
  //  kds
  // ═════════════════════════════════════════════════════════════════
  describe('kds', () => {
    it('delegates to service with filters', async () => {
      serviceMock.kdsView.mockResolvedValue({
        branchId: 'branch-1', generatedAt: '2025-01-01T00:00:00Z', areas: [],
      });
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const filters = { branchId: 'branch-1', preparationAreaId: 'area-1' };
      const result = await ctrl.kds(mockUser, ctx, filters);

      expect(serviceMock.kdsView).toHaveBeenCalledWith(mockUser, ctx, {
        branchId: 'branch-1',
        preparationAreaId: 'area-1',
        states: undefined,
      });
      expect(result.areas).toEqual([]);
    });

    it('passes through errors from service', async () => {
      serviceMock.kdsView.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(ctrl.kds(mockUser, ctx, {} as any)).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  list
  // ═════════════════════════════════════════════════════════════════
  describe('list', () => {
    it('delegates to service with filters', async () => {
      serviceMock.list.mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const filters = { page: 1, pageSize: 20 };
      await ctrl.list(mockUser, ctx, filters);

      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, ctx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(ctrl.list(mockUser, ctx, {} as any)).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('delegates to service and serializes Decimal fields', async () => {
      serviceMock.getById.mockResolvedValue(makeOrder({
        items: [makeItem()],
        stateLogs: [{
          id: 'log-1', orderId: 'order-1',
          fromStatus: null, toStatus: 'PENDING',
          changedByUserId: 'user-1', reason: 'Creación',
          metadata: null, createdAt: new Date('2025-01-01'),
        }],
      }));
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const result = await ctrl.getById(mockUser, ctx, 'order-1');

      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, ctx, 'order-1');
      expect(result.subtotal).toBe('100');
      expect(result.total).toBe('121');
      expect(result.items[0]!.unitPrice).toBe('100');
      expect(result.items[0]!.lineTotal).toBe('200');
      expect(result.stateLogs).toHaveLength(1);
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(ctrl.getById(mockUser, ctx, 'order-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('delegates to service and serializes response', async () => {
      serviceMock.create.mockResolvedValue(makeOrder());
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const dto = { items: [{ productId: 'prod-1', quantity: 2 }] };
      const result = await ctrl.create(mockUser, ctx, dto);

      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, ctx, dto);
      expect(result.total).toBe('121');
      expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(ctrl.create(mockUser, ctx, {} as any)).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  addItem
  // ═════════════════════════════════════════════════════════════════
  describe('addItem', () => {
    it('delegates to service with dto fields', async () => {
      serviceMock.addItem.mockResolvedValue({
        order: makeOrder(),
        item: makeItem(),
      });
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const dto = { productId: 'prod-1', quantity: 2, notes: 'Sin cebolla' };
      const result = await ctrl.addItem(mockUser, ctx, 'order-1', dto);

      expect(serviceMock.addItem).toHaveBeenCalledWith(
        mockUser, ctx, 'order-1', 'prod-1', 2, 'Sin cebolla',
      );
      expect(result.order.total).toBe('121');
      expect(result.item.productName).toBe('Hamburguesa');
    });

    it('adds item without notes', async () => {
      serviceMock.addItem.mockResolvedValue({ order: makeOrder(), item: makeItem() });
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const dto = { productId: 'prod-1', quantity: 1 };
      await ctrl.addItem(mockUser, ctx, 'order-1', dto);

      expect(serviceMock.addItem).toHaveBeenCalledWith(
        mockUser, ctx, 'order-1', 'prod-1', 1, undefined,
      );
    });

    it('passes through errors from service', async () => {
      serviceMock.addItem.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(
        ctrl.addItem(mockUser, ctx, 'order-1', { productId: 'prod-1', quantity: 1 }),
      ).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  updateItem
  // ═════════════════════════════════════════════════════════════════
  describe('updateItem', () => {
    it('delegates to service with dto', async () => {
      serviceMock.updateItem.mockResolvedValue({
        order: makeOrder(),
        item: makeItem({ quantity: 3, lineTotal: decimal(300) }),
      });
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const dto = { quantity: 3 };
      const result = await ctrl.updateItem(mockUser, ctx, 'order-1', 'item-1', dto);

      expect(serviceMock.updateItem).toHaveBeenCalledWith(mockUser, ctx, 'order-1', 'item-1', dto);
      expect(result.item.quantity).toBe(3);
    });

    it('passes through errors from service', async () => {
      serviceMock.updateItem.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(
        ctrl.updateItem(mockUser, ctx, 'order-1', 'item-1', {}),
      ).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  removeItem
  // ═════════════════════════════════════════════════════════════════
  describe('removeItem', () => {
    it('delegates to service and serializes', async () => {
      serviceMock.removeItem.mockResolvedValue(makeOrder({ items: [] }));
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const result = await ctrl.removeItem(mockUser, ctx, 'order-1', 'item-1');

      expect(serviceMock.removeItem).toHaveBeenCalledWith(mockUser, ctx, 'order-1', 'item-1');
      expect(result.total).toBe('121');
    });

    it('passes through errors from service', async () => {
      serviceMock.removeItem.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(ctrl.removeItem(mockUser, ctx, 'order-1', 'item-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  transition
  // ═════════════════════════════════════════════════════════════════
  describe('transition', () => {
    it('delegates to service', async () => {
      serviceMock.transition.mockResolvedValue(makeOrder({ status: OrderStatus.SENT_TO_KITCHEN }));
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const dto = { to: OrderStatus.SENT_TO_KITCHEN };
      const result = await ctrl.transition(mockUser, ctx, 'order-1', dto);

      expect(serviceMock.transition).toHaveBeenCalledWith(mockUser, ctx, 'order-1', dto);
      expect(result.status).toBe(OrderStatus.SENT_TO_KITCHEN);
    });

    it('passes through errors from service', async () => {
      serviceMock.transition.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(
        ctrl.transition(mockUser, ctx, 'order-1', { to: OrderStatus.SENT_TO_KITCHEN }),
      ).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  cancel
  // ═════════════════════════════════════════════════════════════════
  describe('cancel', () => {
    it('delegates to service with reason', async () => {
      serviceMock.cancel.mockResolvedValue(makeOrder({ status: OrderStatus.CANCELLED }));
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const dto = { reason: 'Cliente no quiere esperar' };
      const result = await ctrl.cancel(mockUser, ctx, 'order-1', dto);

      expect(serviceMock.cancel).toHaveBeenCalledWith(mockUser, ctx, 'order-1', dto);
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('passes through errors from service', async () => {
      serviceMock.cancel.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(
        ctrl.cancel(mockUser, ctx, 'order-1', { reason: 'test' }),
      ).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getLogs
  // ═════════════════════════════════════════════════════════════════
  describe('getLogs', () => {
    it('delegates to service and serializes dates', async () => {
      const logs = [
        {
          id: 'log-1', orderId: 'order-1', businessId: 'biz-1',
          fromStatus: null, toStatus: 'PENDING',
          changedByUserId: 'user-1', reason: 'Creación', metadata: null,
          createdAt: new Date('2025-01-01'),
        },
      ];
      serviceMock.getLogs.mockResolvedValue(logs);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      const result = await ctrl.getLogs(mockUser, ctx, 'order-1');

      expect(serviceMock.getLogs).toHaveBeenCalledWith(mockUser, ctx, 'order-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.createdAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('passes through errors from service', async () => {
      serviceMock.getLogs.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(OrdersController, [
        { provide: OrdersService, useValue: serviceMock },
      ]);
      await expect(ctrl.getLogs(mockUser, ctx, 'order-1')).rejects.toThrow(serverError);
    });
  });
});
