import { OrderStatus, OrderType, OrderChannel } from '@prisma/client';
import type { Order, OrderItem, OrderStateLog } from '@prisma/client';
import {
  toOrderItemDto,
  toOrderStateLogDto,
  toOrderListItemDto,
  toOrderDto,
  toKdsOrderDto,
} from './mappers';
import { dateToString } from '../common/mapper';
import { decimal } from '../test/mocks';

const mockDate = new Date('2025-06-01T12:00:00Z');

// ─── Factories ──────────────────────────────────────────────

function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'item-1',
    businessId: 'biz-1',
    orderId: 'order-1',
    productId: 'prod-1',
    productName: 'Coca Cola',
    unitPrice: decimal(2.50),
    taxRate: decimal(0.18),
    preparationAreaId: 'area-1',
    preparationAreaName: 'Barra',
    quantity: 2,
    notes: 'Sin hielo',
    lineTotal: decimal(5.00),
    createdAt: mockDate,
    ...overrides,
  } as OrderItem;
}

function makeOrderStateLog(overrides: Partial<OrderStateLog> = {}): OrderStateLog {
  return {
    id: 'log-1',
    businessId: 'biz-1',
    orderId: 'order-1',
    fromStatus: OrderStatus.PENDING,
    toStatus: OrderStatus.SENT_TO_KITCHEN,
    changedByUserId: 'user-1',
    reason: 'Confirmado por cajero',
    metadata: { source: 'POS' },
    createdAt: mockDate,
    ...overrides,
  } as OrderStateLog;
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    tableId: 'table-1',
    customerId: null,
    cashierId: 'user-1',
    waiterId: 'user-2',
    type: OrderType.DINE_IN,
    channel: OrderChannel.POS_WEB,
    status: OrderStatus.SENT_TO_KITCHEN,
    subtotal: decimal(5.00),
    taxTotal: decimal(0.90),
    total: decimal(5.90),
    globalNotes: 'Mesa 5',
    cashRegisterId: 'cash-1',
    shiftId: 'shift-1',
    version: 1,
    cancelledAt: null,
    cancelledByUserId: null,
    cancellationReason: null,
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  } as Order;
}

// ─── toOrderItemDto ─────────────────────────────────────────

describe('toOrderItemDto', () => {
  it('maps all fields correctly', () => {
    const item = makeOrderItem();
    const result = toOrderItemDto(item);

    expect(result).toEqual({
      id: 'item-1',
      businessId: 'biz-1',
      orderId: 'order-1',
      productId: 'prod-1',
      productName: 'Coca Cola',
      unitPrice: '2.5',
      taxRate: '0.18',
      preparationAreaId: 'area-1',
      preparationAreaName: 'Barra',
      quantity: 2,
      notes: 'Sin hielo',
      lineTotal: '5',
      createdAt: dateToString(mockDate),
    });
  });

  it('handles null taxRate', () => {
    const item = makeOrderItem({ taxRate: null });
    const result = toOrderItemDto(item);

    expect(result.taxRate).toBeNull();
  });

  it('handles null notes', () => {
    const item = makeOrderItem({ notes: null });
    const result = toOrderItemDto(item);

    expect(result.notes).toBeNull();
  });
});

// ─── toOrderStateLogDto ─────────────────────────────────────

describe('toOrderStateLogDto', () => {
  it('maps all fields correctly', () => {
    const log = makeOrderStateLog();
    const result = toOrderStateLogDto(log);

    expect(result).toEqual({
      id: 'log-1',
      businessId: 'biz-1',
      orderId: 'order-1',
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.SENT_TO_KITCHEN,
      changedByUserId: 'user-1',
      reason: 'Confirmado por cajero',
      metadata: { source: 'POS' },
      createdAt: dateToString(mockDate),
    });
  });

  it('handles null metadata and reason', () => {
    const log = makeOrderStateLog({ metadata: null, reason: null, fromStatus: null });
    const result = toOrderStateLogDto(log);

    expect(result.metadata).toBeNull();
    expect(result.reason).toBeNull();
    expect(result.fromStatus).toBeNull();
  });
});

// ─── toOrderListItemDto ─────────────────────────────────────

describe('toOrderListItemDto', () => {
  it('maps all fields correctly', () => {
    const order = makeOrder();
    const result = toOrderListItemDto(order, 3);

    expect(result).toEqual({
      id: 'order-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      tableId: 'table-1',
      type: OrderType.DINE_IN,
      status: OrderStatus.SENT_TO_KITCHEN,
      total: '5.9',
      itemCount: 3,
      cashierId: 'user-1',
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });
});

// ─── toOrderDto ─────────────────────────────────────────────

describe('toOrderDto', () => {
  it('maps all fields with items and logs', () => {
    const order = makeOrder();
    const items = [makeOrderItem()];
    const logs = [makeOrderStateLog()];
    const result = toOrderDto(order, items, logs);

    expect(result.id).toBe('order-1');
    expect(result.status).toBe(OrderStatus.SENT_TO_KITCHEN);
    expect(result.subtotal).toBe('5');
    expect(result.taxTotal).toBe('0.9');
    expect(result.total).toBe('5.9');
    expect(result.version).toBe(1);
    expect(result.cancelledAt).toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.productName).toBe('Coca Cola');
    const stateLogs = result.stateLogs!;
    expect(stateLogs.length).toBe(1);
    expect(stateLogs[0]!.fromStatus).toBe(OrderStatus.PENDING);
  });

  it('handles cancelled order with dates', () => {
    const cancelledAt = new Date('2025-06-01T13:00:00Z');
    const order = makeOrder({
      status: OrderStatus.CANCELLED,
      cancelledAt,
      cancelledByUserId: 'user-1',
      cancellationReason: 'Cliente no vino',
    });
    const result = toOrderDto(order, [], []);

    expect(result.cancelledAt).toBe(dateToString(cancelledAt));
    expect(result.cancelledByUserId).toBe('user-1');
    expect(result.cancellationReason).toBe('Cliente no vino');
  });

  it('maps dates correctly', () => {
    const order = makeOrder();
    const result = toOrderDto(order, [], []);

    expect(result.createdAt).toBe(dateToString(mockDate));
    expect(result.updatedAt).toBe(dateToString(mockDate));
  });
});

// ─── toKdsOrderDto ──────────────────────────────────────────

describe('toKdsOrderDto', () => {
  it('maps order with table info and items', () => {
    const order = makeOrder();
    const items = [makeOrderItem()];
    const kdsOrder = { ...order, table: { number: '5' }, items };

    const result = toKdsOrderDto(kdsOrder);

    expect(result.id).toBe('order-1');
    expect(result.tableNumber).toBe('5');
    expect(result.tableId).toBe('table-1');
    expect(result.status).toBe(OrderStatus.SENT_TO_KITCHEN);
    expect(result.total).toBe('5.9');
    expect(result.itemCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.productName).toBe('Coca Cola');
    expect(result.createdAt).toBe(dateToString(mockDate));
    expect(result.elapsedSeconds).toBeGreaterThanOrEqual(0);
  });

  it('handles null table', () => {
    const order = makeOrder();
    const items = [makeOrderItem()];
    const kdsOrder = { ...order, table: null, items };

    const result = toKdsOrderDto(kdsOrder);

    expect(result.tableNumber).toBeNull();
    expect(result.tableId).toBe('table-1');
  });

  it('calculates elapsedSeconds correctly', () => {
    const pastDate = new Date(Date.now() - 60000); // 1 minute ago
    const order = makeOrder({ createdAt: pastDate });
    const items = [makeOrderItem()];

    const result = toKdsOrderDto({ ...order, table: null, items });

    // Should be around 60 seconds
    expect(result.elapsedSeconds).toBeGreaterThanOrEqual(55);
    expect(result.elapsedSeconds).toBeLessThanOrEqual(65);
  });
});
