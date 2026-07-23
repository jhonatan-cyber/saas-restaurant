import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { OrderStateBadge } from '~/components';
import type { Order } from '~/lib/api';

interface OrderHeaderProps {
  order: Order;
}

export function OrderHeader({ order }: OrderHeaderProps): ReactNode {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            to="/orders"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Volver a órdenes
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Orden #{order.id.slice(-8).toUpperCase()}
          </h1>
        </div>
        <OrderStateBadge status={order.status} />
      </div>

      {order.status === 'CANCELLED' && order.cancellationReason && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Orden cancelada</p>
          <p className="mt-1">
            Razón: {order.cancellationReason}
            {order.cancelledByUserId && (
              <span className="ml-2 text-xs text-red-700">
                (por {order.cancelledByUserId.slice(-8)})
              </span>
            )}
          </p>
        </div>
      )}
    </>
  );
}
