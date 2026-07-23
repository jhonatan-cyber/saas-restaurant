import type { ReactNode } from 'react';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@saas/shared';
import type { Order } from '~/lib/api';
import { isTerminal } from '~/lib/order-state-machine';

interface OrderActionsProps {
  order: Order;
  next: readonly OrderStatus[];
  canPay: boolean;
  canCancel: boolean;
  isAdmin: boolean;
  actionError: string | null;
  onTransition: (to: OrderStatus) => void;
  onPay: () => void;
  onCancel: () => void;
}

export function OrderActions({
  order,
  next,
  canPay,
  canCancel,
  isAdmin,
  actionError,
  onTransition,
  onPay,
  onCancel,
}: OrderActionsProps): ReactNode {
  const terminal = isTerminal(order.status);

  if (terminal) return null;

  return (
    <div className="card flex flex-wrap items-center gap-2 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Acciones
      </span>
      {next.map((to) => (
        <button
          key={to}
          type="button"
          className="btn-secondary"
          onClick={() => onTransition(to)}
        >
          → {ORDER_STATUS_LABELS[to]}
        </button>
      ))}
      {canPay && (
        <button
          type="button"
          className="btn-primary ml-auto"
          onClick={onPay}
        >
          Cobrar (Bs {Number(order.total).toFixed(2)})
        </button>
      )}
      {canCancel && isAdmin && !canPay && (
        <button
          type="button"
          className="btn-danger ml-auto"
          onClick={onCancel}
        >
          Cancelar orden
        </button>
      )}
      {actionError && (
        <p className="basis-full text-sm text-red-600">{actionError}</p>
      )}
    </div>
  );
}
