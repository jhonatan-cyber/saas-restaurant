/**
 * State machine de la orden, espejado del backend (apps/api/src/orders/order-state-machine.ts).
 * Mantener sincronizado cuando se cambie allá.
 *
 * D3=A: DRAFT está reservado (no se usa en F3). El primer estado persistido es PENDING.
 *
 * Matriz:
 *   PENDING          → SENT_TO_KITCHEN, CANCELLED
 *   SENT_TO_KITCHEN  → IN_PREPARATION, CANCELLED
 *   IN_PREPARATION   → READY, CANCELLED
 *   READY            → DELIVERED, CANCELLED
 *   DELIVERED        → PAID              (no CANCELLED post-delivery)
 *   PAID             → []                (terminal)
 *   CANCELLED        → []                (terminal)
 *   DRAFT            → []                (reservado, no usado)
 */
import type { OrderStatus } from '@saas/shared';

export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: [],
  PENDING: ['SENT_TO_KITCHEN', 'CANCELLED'],
  SENT_TO_KITCHEN: ['IN_PREPARATION', 'CANCELLED'],
  IN_PREPARATION: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['PAID'],
  PAID: [],
  CANCELLED: [],
} as const;

/** Estados terminales: la orden no se opera más. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ['PAID', 'CANCELLED'];

/** Estados que el KDS muestra (no incluye READY acá para mantener compat con el default del backend). */
export const KDS_VISIBLE_STATUSES: readonly OrderStatus[] = [
  'SENT_TO_KITCHEN',
  'IN_PREPARATION',
];

/** Estados donde se pueden editar ítems (qty/notes). */
export const EDITABLE_STATUSES: readonly OrderStatus[] = ['PENDING'];

/** Estados "activos" (no terminales). */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'SENT_TO_KITCHEN',
  'IN_PREPARATION',
  'READY',
  'DELIVERED',
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isEditable(status: OrderStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function isActive(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
