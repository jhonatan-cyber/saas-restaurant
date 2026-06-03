import type { ReactNode } from 'react';
import { StatusBadge } from './status-badge';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@saas/shared';

/**
 * Badge de estado de una orden.
 * Mapea OrderStatus → variant del StatusBadge genérico + label en español.
 * Variantes:
 *   DRAFT          → neutral (reservado, no se usa en F3)
 *   PENDING        → warning (creada, no enviada a cocina)
 *   SENT_TO_KITCHEN→ info (en cola)
 *   IN_PREPARATION → info (cocinándose)
 *   READY          → success (lista para entregar)
 *   DELIVERED      → success (entregada al cliente)
 *   PAID           → neutral (cerrada, no se opera más)
 *   CANCELLED      → danger (cancelada, terminal)
 */
const VARIANTS: Record<
  OrderStatus,
  'success' | 'warning' | 'danger' | 'neutral' | 'info'
> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  SENT_TO_KITCHEN: 'info',
  IN_PREPARATION: 'info',
  READY: 'success',
  DELIVERED: 'success',
  PAID: 'neutral',
  CANCELLED: 'danger',
} as const;

interface OrderStateBadgeProps {
  status: OrderStatus;
}

export function OrderStateBadge({ status }: OrderStateBadgeProps): ReactNode {
  return (
    <StatusBadge
      label={ORDER_STATUS_LABELS[status]}
      variant={VARIANTS[status] ?? 'neutral'}
    />
  );
}
