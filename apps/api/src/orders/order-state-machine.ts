import { OrderStatus } from '@saas/shared';

/**
 * Matriz de transiciones válidas del state machine de Order.
 *
 * REGLAS (R3, R5, R6 del SDD):
 *  - DRAFT está RESERVADO (no se usa en F3 — el carrito vive en frontend).
 *  - CANCELLED es siempre estado terminal (no hay "revivir" una orden cancelada).
 *  - PAID es terminal (refunds son F4).
 *  - DELIVERED → PAID es la única salida (no se puede cancelar post-entrega).
 *  - Cualquier transición no listada devuelve false y el service responde 422.
 *
 * Esta función es PURA: no toca Prisma, no emite eventos, no tiene side
 * effects. El service la invoca antes de cualquier update.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.DRAFT]: [],
  [OrderStatus.PENDING]: [OrderStatus.SENT_TO_KITCHEN, OrderStatus.CANCELLED],
  [OrderStatus.SENT_TO_KITCHEN]: [OrderStatus.IN_PREPARATION, OrderStatus.CANCELLED],
  [OrderStatus.IN_PREPARATION]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.PAID],
  [OrderStatus.PAID]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Estados terminales. Una orden en estos estados no acepta más cambios
 * salvo lectura.
 */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.CANCELLED,
];

/**
 * Estados "activos" — tienen impacto operativo (cocina, mesa, etc.).
 */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.IN_PREPARATION,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
];

/**
 * Estados que el KDS debe mostrar (por defecto).
 */
export const KDS_VISIBLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.SENT_TO_KITCHEN,
  OrderStatus.IN_PREPARATION,
];

/**
 * Indica si la transición `from → to` es válida.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Devuelve los destinos válidos desde un estado (útil para UI).
 */
export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

/**
 * Indica si un estado es terminal.
 */
export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Indica si una orden en este estado todavía es editable (puede recibir
 * cambios en sus ítems). Solo PENDING acepta add/update/remove de items.
 */
export function isEditable(status: OrderStatus): boolean {
  return status === OrderStatus.PENDING;
}
