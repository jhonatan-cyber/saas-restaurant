import type { Order, OrderItem, OrderStateLog } from '@prisma/client';
import type {
  OrderDTO,
  OrderItemDTO,
  OrderListItemDTO,
  OrderStateLogDTO,
  KdsOrderDTO,
} from '@saas/shared';
import { dateToString, dateToNull, decToString, decToNull } from '../common/mapper';

// ─── OrderItemDTO ───────────────────────────────────────────

export function toOrderItemDto(item: OrderItem): OrderItemDTO {
  return {
    id: item.id,
    businessId: item.businessId,
    orderId: item.orderId,
    productId: item.productId,
    productName: item.productName,
    unitPrice: decToString(item.unitPrice),
    taxRate: decToNull(item.taxRate),
    preparationAreaId: item.preparationAreaId,
    preparationAreaName: item.preparationAreaName,
    quantity: item.quantity,
    notes: item.notes,
    lineTotal: decToString(item.lineTotal),
    createdAt: dateToString(item.createdAt),
  };
}

// ─── OrderStateLogDTO ───────────────────────────────────────

export function toOrderStateLogDto(log: OrderStateLog): OrderStateLogDTO {
  return {
    id: log.id,
    businessId: log.businessId,
    orderId: log.orderId,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    changedByUserId: log.changedByUserId,
    reason: log.reason,
    metadata: log.metadata as Record<string, unknown> | null,
    createdAt: dateToString(log.createdAt),
  };
}

// ─── OrderListItemDTO ────────────────────────────────────────

export function toOrderListItemDto(
  order: Order,
  itemCount: number,
): OrderListItemDTO {
  return {
    id: order.id,
    businessId: order.businessId,
    branchId: order.branchId,
    tableId: order.tableId,
    tableNumber: null,
    type: order.type,
    status: order.status,
    total: decToString(order.total),
    itemCount,
    cashierId: order.cashierId,
    createdAt: dateToString(order.createdAt),
    updatedAt: dateToString(order.updatedAt),
  };
}

// ─── OrderDTO (full) ────────────────────────────────────────

export function toOrderDto(
  order: Order,
  items: OrderItem[],
  logs: OrderStateLog[],
): OrderDTO {
  return {
    id: order.id,
    businessId: order.businessId,
    branchId: order.branchId,
    tableId: order.tableId,
    customerId: order.customerId,
    cashierId: order.cashierId,
    waiterId: order.waiterId,
    type: order.type,
    channel: order.channel,
    status: order.status,
    subtotal: decToString(order.subtotal),
    taxTotal: decToString(order.taxTotal),
    total: decToString(order.total),
    discount: decToString(order.discount),
    discountReason: order.discountReason,
    globalNotes: order.globalNotes,
    cashRegisterId: order.cashRegisterId,
    shiftId: order.shiftId,
    version: order.version,
    cancelledAt: dateToNull(order.cancelledAt),
    cancelledByUserId: order.cancelledByUserId,
    cancellationReason: order.cancellationReason,
    items: items.map(toOrderItemDto),
    stateLogs: logs.map(toOrderStateLogDto),
    createdAt: dateToString(order.createdAt),
    updatedAt: dateToString(order.updatedAt),
  };
}

// ─── KdsOrderDTO ────────────────────────────────────────────

export function toKdsOrderDto(
  order: Order & { table?: { number: string } | null; items: OrderItem[] },
): KdsOrderDTO {
  const elapsedSeconds = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / 1000,
  );
  return {
    id: order.id,
    version: order.version,
    tableId: order.tableId,
    tableNumber: order.table?.number ?? null,
    status: order.status,
    type: order.type,
    globalNotes: order.globalNotes,
    total: decToString(order.total),
    itemCount: order.items.length,
    createdAt: dateToString(order.createdAt),
    elapsedSeconds,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      notes: i.notes,
      preparationAreaId: i.preparationAreaId,
      preparationAreaName: i.preparationAreaName,
    })),
  };
}
