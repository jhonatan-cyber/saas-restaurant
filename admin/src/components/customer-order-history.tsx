import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ordersApi, customersApi, loyaltyApi } from '~/lib/api';
import { ORDER_TYPE_LABELS } from '@saas/shared';
import { OrderStateBadge } from './order-state-badge';

interface CustomerOrderHistoryProps {
  customerId: string;
  customerName: string;
}

/** Formats seconds elapsed into a human-readable string (es-BO locale). */
function formatElapsed(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'hace segundos';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return `hace ${hrs}h ${remainMins}m`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

/**
 * Small list of recent orders for a customer, shown inline in the POS cart panel.
 *
 * - Shows the 5 most recent orders with status, total, items count, and elapsed time.
 * - Displays customer stats: total orders and total spent from the last order data.
 * - Clicking an order navigates to the order detail page.
 */
export function CustomerOrderHistory({
  customerId,
  customerName,
}: CustomerOrderHistoryProps): ReactNode {
  // Fetch customer details for accurate totalOrders, totalSpent, and loyalty points
  const customerQuery = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });

  // Fetch loyalty info for this customer
  const loyaltyQuery = useQuery({
    queryKey: ['loyalty', 'customer', customerId],
    queryFn: () => loyaltyApi.getCustomerLoyalty(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
    retry: false,
  });

  // Fetch recent orders for this customer
  const ordersQuery = useQuery({
    queryKey: ['orders', 'customer', customerId],
    queryFn: () =>
      ordersApi.list(
        {
          customerId,
          pageSize: 5,
        },
        undefined,
      ),
    enabled: !!customerId,
    staleTime: 15_000,
  });

  const orders = useMemo(() => ordersQuery.data?.data ?? [], [ordersQuery.data]);

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando pedidos…
        </div>
      </div>
    );
  }

  // Error state
  if (ordersQuery.error && !orders.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        Error al cargar historial del cliente
      </div>
    );
  }

  // Empty state — customer has no orders yet
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 14l2 2 4-4" />
            </svg>
            <p className="truncate text-sm font-medium text-slate-700">
              {customerName}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            0 pedidos
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Cliente nuevo — sin pedidos anteriores
        </p>
      </div>
    );
  }

  // Accurate stats from the customer record
  const customer = customerQuery.data;
  const totalOrders = customer?.totalOrders ?? ordersQuery.data?.meta?.total ?? orders.length;
  const totalSpent = customer?.totalSpent != null
    ? Number(customer.totalSpent)
    : orders.reduce((sum, o) => sum + Number(o.total), 0);

  // Order status priority: active orders first, then history
  const STATUS_PRIORITY: Record<string, number> = {
    SENT_TO_KITCHEN: 0,
    IN_PREPARATION: 1,
    READY: 2,
    DELIVERED: 3,
    PAID: 4,
    PENDING: 5,
    CANCELLED: 6,
    DRAFT: 7,
  };

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status] ?? 99;
        const pb = STATUS_PRIORITY[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [orders],
  );

  // Show a combined loading state while both queries are loading
  const isLoading = ordersQuery.isLoading || (customerQuery.isLoading && totalOrders > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-4 w-4 shrink-0 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          <span className="truncate text-sm font-semibold text-slate-800">
            {customerName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loyaltyQuery.data && loyaltyQuery.data.availablePoints > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700" title="Puntos de fidelización disponibles">
              🪙 {loyaltyQuery.data.availablePoints} pts
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {totalOrders} pedidos
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
            Bs {totalSpent.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Orders list */}
      <div className="divide-y divide-slate-100">
        {sortedOrders.map((order) => (
          <Link
            key={order.id}
            to="/orders/$id"
            params={{ id: order.id }}
            className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-slate-50"
          >
            {/* Status indicator dot */}
            <div className="shrink-0">
              <OrderStateBadge status={order.status} />
            </div>

            {/* Order info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-slate-800">
                  #{order.id.slice(-6).toUpperCase()}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {ORDER_TYPE_LABELS[order.type]}
                </span>                  {order.tableId && (
                    <span className="shrink-0 text-[10px] text-slate-400">
                      · Mesa {order.tableId.slice(-3)}
                    </span>
                  )}
              </div>
              <p className="truncate text-xs text-slate-500">
                {order.itemCount} ítems · Bs {Number(order.total).toFixed(2)} · {formatElapsed(order.createdAt)}
              </p>
            </div>

            {/* Chevron */}
            <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Footer link */}
      {totalOrders > 5 && (
        <div className="border-t border-slate-100 px-3 py-2">
          <Link
            to="/orders"
            search={{ customerId }}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Ver todos los {totalOrders} pedidos →
          </Link>
        </div>
      )}
    </div>
  );
}
