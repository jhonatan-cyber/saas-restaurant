import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ordersApi, type OrderListItem } from '~/lib/api';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@saas/shared';

interface PosActiveOrdersProps {
  branchId: string;
  onPayOrder: (order: OrderListItem) => void;
}

const ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING',
  'SENT_TO_KITCHEN',
  'IN_PREPARATION',
  'READY',
  'DELIVERED',
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  SENT_TO_KITCHEN: 1,
  IN_PREPARATION: 2,
  READY: 3,
  DELIVERED: 4,
};

function elapsedTime(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remain = mins % 60;
  return `${hrs}h ${remain}min`;
}

/**
 * Panel de órdenes activas para el POS.
 * Muestra las órdenes de la sucursal en estado activo,
 * permitiendo acciones rápidas como "Cobrar" (DELIVERED)
 * o ir al detalle.
 */
export function PosActiveOrders({
  branchId,
  onPayOrder,
}: PosActiveOrdersProps): ReactNode {
  const [expandedStatus, setExpandedStatus] = useState<string | null>('DELIVERED');

  const activeOrdersQuery = useQuery({
    queryKey: ['orders', 'pos-active', branchId],
    queryFn: () =>
      ordersApi.list(
        {
          status: ACTIVE_STATUSES,
          pageSize: 50,
        },
        branchId,
      ),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const orders = useMemo(() => {
    if (!activeOrdersQuery.data?.data) return [];
    return [...activeOrdersQuery.data.data].sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [activeOrdersQuery.data]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, OrderListItem[]> = {};
    for (const o of orders) {
      if (!groups[o.status]) groups[o.status] = [];
      groups[o.status].push(o);
    }
    return groups;
  }, [orders]);

  const deliveredCount = groupedByStatus['DELIVERED']?.length ?? 0;

  if (activeOrdersQuery.isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Cargando órdenes activas…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
        <svg
          className="mx-auto h-8 w-8 text-slate-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="mt-2 text-sm font-medium text-slate-700">
          No hay órdenes activas
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Las órdenes nuevas aparecerán aquí automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Órdenes activas
          </h2>
          <span className="inline-flex items-center justify-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
            {orders.length}
          </span>
        </div>
        {deliveredCount > 0 && (
          <button
            type="button"
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
            onClick={() => setExpandedStatus('DELIVERED')}
          >
            Cobrar ({deliveredCount})
          </button>
        )}
      </div>

      {/* Orders grouped by status */}
      <div className="divide-y divide-slate-100">
        {Object.entries(groupedByStatus).map(([status, statusOrders]) => {
          const isExpanded = expandedStatus === status;
          const isDelivered = status === 'DELIVERED';

          return (
            <div key={status}>
              {/* Status group header */}
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                onClick={() =>
                  setExpandedStatus(isExpanded ? null : status)
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {ORDER_STATUS_LABELS[status as OrderStatus] ?? status}
                  </span>
                  <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                    {statusOrders.length}
                  </span>
                </div>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Orders in this status group */}
              {isExpanded && (
                <div className="space-y-1 px-4 pb-3">
                  {statusOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm hover:bg-slate-100 transition-colors"
                    >
                      {/* Left: order info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/orders/$id"
                            params={{ id: order.id }}
                            className="truncate font-medium text-slate-900 hover:text-brand-600"
                          >
                            #{order.id.slice(-8).toUpperCase()}
                          </Link>
                          {order.tableId && (
                            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                              M{order.tableNumber ?? order.tableId.slice(-3)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>
                            {ORDER_STATUS_LABELS[order.status as OrderStatus] ??
                              order.status}
                          </span>
                          <span>·</span>
                          <span>{elapsedTime(order.createdAt)}</span>
                          <span>·</span>
                          <span>Bs {Number(order.total).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isDelivered && (
                          <button
                            type="button"
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                            onClick={() => onPayOrder(order)}
                          >
                            Cobrar
                          </button>
                        )}
                        <Link
                          to="/orders/$id"
                          params={{ id: order.id }}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Detalle
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
