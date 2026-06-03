import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ordersApi, type OrderFilters, type OrderListItem } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { OrderStateBadge } from '~/components/order-state-badge';
import {
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  type OrderStatus,
  type OrderType,
} from '@saas/shared';

/**
 * Lista paginada de órdenes con filtros.
 * - Todos los usuarios autenticados pueden acceder (lectura).
 * - Filtros: estado (multi), tipo, rango de fechas.
 * - Click en una fila → /orders/$id.
 * - Refresca vía WS (ya invalidado en _authed.tsx).
 */
export const Route = createFileRoute('/_authed/orders')({
  component: OrdersListPage,
});

const PAGE_SIZE = 20;
const ORDER_TYPES: OrderType[] = ['DINE_IN', 'TAKEOUT', 'DELIVERY'];
const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'SENT_TO_KITCHEN',
  'IN_PREPARATION',
  'READY',
  'DELIVERED',
  'PAID',
  'CANCELLED',
];

interface Filters {
  status: OrderStatus[];
  type: OrderType | null;
  dateFrom: string;
  dateTo: string;
  page: number;
}

function OrdersListPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.defaultBranchId ?? user?.branches[0]?.id ?? null;

  const [filters, setFilters] = useState<Filters>({
    status: [],
    type: null,
    dateFrom: '',
    dateTo: '',
    page: 1,
  });

  const listQuery = useQuery({
    queryKey: ['orders', 'list', { ...filters, branchId }],
    queryFn: () =>
      ordersApi.list(
        {
          status: filters.status.length > 0 ? filters.status : undefined,
          type: filters.type ?? undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          page: filters.page,
          pageSize: PAGE_SIZE,
        },
        branchId ?? undefined,
      ),
    enabled: !!branchId,
  });

  const totalPages = listQuery.data?.meta.totalPages ?? 0;
  const orders: OrderListItem[] = listQuery.data?.data ?? [];

  const toggleStatus = (s: OrderStatus): void => {
    setFilters((f) => ({
      ...f,
      status: f.status.includes(s) ? f.status.filter((x) => x !== s) : [...f.status, s],
      page: 1,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Órdenes</h1>
        <p className="text-sm text-slate-500">
          Historial y seguimiento de órdenes de la sucursal.
        </p>
      </div>

      {/* Filtros */}
      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tipo
            </label>
            <select
              className="input"
              value={filters.type ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  type: e.target.value === '' ? null : (e.target.value as OrderType),
                  page: 1,
                }))
              }
            >
              <option value="">Todos</option>
              {ORDER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ORDER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Desde
            </label>
            <input
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hasta
            </label>
            <input
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))
              }
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado (multi)
          </label>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((s) => {
              const active = filters.status.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {ORDER_STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando órdenes…</div>
        ) : listQuery.error ? (
          <div className="p-8 text-center text-red-600">Error al cargar órdenes</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay órdenes con esos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Ítems</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {o.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {ORDER_TYPE_LABELS[o.type]}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStateBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {o.itemCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      Bs {Number(o.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleString('es-BO')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/orders/$id"
                        params={{ id: o.id }}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Página {filters.page} de {totalPages} ({listQuery.data?.meta.total} órdenes)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={filters.page <= 1 || listQuery.isLoading}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={filters.page >= totalPages || listQuery.isLoading}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
