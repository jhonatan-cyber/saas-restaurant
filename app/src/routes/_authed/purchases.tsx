import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { purchasesApi, ApiClientError, type PurchaseFilters } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { RoutePending, StatusBadge, Skeleton } from '~/components';

export const Route = createFileRoute('/_authed/purchases')({
  component: PurchasesListPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

function PurchasesListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<PurchaseFilters>({
    status: undefined,
    search: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');

  const listQuery = useQuery({
    queryKey: ['purchases', filters],
    queryFn: () => purchasesApi.list(filters),
  });

  const handleSearch = (): void => {
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const canWrite = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    COMPLETED: 'Completada',
    CANCELLED: 'Anulada',
  };

  const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'danger'> = {
    PENDING: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compras</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona las compras a proveedores
          </p>
        </div>
        {canWrite && (
          <Link to="/purchases/new" className="btn-primary">
            + Nueva compra
          </Link>
        )}
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Buscar por N° de compra…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <button className="btn-secondary" onClick={handleSearch}>
              Buscar
            </button>
          </div>
          <select
            className="input"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value || undefined,
                page: 1,
              }))
            }
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Anuladas</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <Skeleton name="purchases-table" loading={listQuery.isLoading}>
          {listQuery.error ? (
            <div className="p-8 text-center text-red-600">
              Error: {String(listQuery.error)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">N° Compra</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3 text-center">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {listQuery.data?.data.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No hay compras. Crea la primera.
                        </td>
                      </tr>
                    )}
                    {listQuery.data?.data.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {p.purchaseNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.supplierName ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700">{p.itemCount}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {Number(p.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            label={STATUS_LABELS[p.status] ?? p.status}
                            variant={STATUS_VARIANTS[p.status] ?? 'neutral'}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to="/purchases/$id"
                            params={{ id: p.id }}
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
              {listQuery.data && listQuery.data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                  <p className="text-slate-600">
                    Página {listQuery.data.meta.page} de {listQuery.data.meta.totalPages} ·{' '}
                    {listQuery.data.meta.total} compras
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary px-3 py-1"
                      disabled={filters.page === 1}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                    >
                      Anterior
                    </button>
                    <button
                      className="btn-secondary px-3 py-1"
                      disabled={filters.page === listQuery.data.meta.totalPages}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Skeleton>
      </div>
    </div>
  );
}
