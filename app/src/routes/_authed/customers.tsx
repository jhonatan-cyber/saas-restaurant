import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  customersApi,
  ApiClientError,
  type Customer,
  type CustomerFilters,
} from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog, RoutePending, StatusBadge, Skeleton } from '~/components';

export const Route = createFileRoute('/_authed/customers')({
  component: CustomersListPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

function CustomersListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    isActive: undefined,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customersApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerToDelete(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      setDeleteError(err instanceof ApiClientError ? err.message : 'Error al eliminar');
    },
  });

  const handleSearch = (): void => {
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const canDelete = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Directorio de clientes y walk-ins. Cualquier rol puede registrar.
          </p>
        </div>
        <Link to="/customers/new" className="btn-primary">
          + Nuevo cliente
        </Link>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2 flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre, NIT, email, teléfono…"
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
            value={filters.isActive === undefined ? '' : String(filters.isActive)}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                isActive:
                  e.target.value === '' ? undefined : e.target.value === 'true',
                page: 1,
              }))
            }
          >
            <option value="">Todos</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <Skeleton name="customers-table" loading={listQuery.isLoading}>
          {listQuery.error ? (
            <div className="p-8 text-center text-red-600">Error: {String(listQuery.error)}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Identificación</th>
                      <th className="px-4 py-3">Email / Teléfono</th>
                      <th className="px-4 py-3">Dirección</th>
                      <th className="px-4 py-3 text-right">Total gastado</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {listQuery.data?.data.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No hay clientes con esos filtros.
                        </td>
                      </tr>
                    )}
                    {listQuery.data?.data.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{c.name}</p>
                          {c.notes && (
                            <p className="text-xs text-slate-500 line-clamp-1">{c.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.taxId ? (
                            <>
                              <code className="text-xs">{c.taxId}</code>
                              {c.taxIdType && (
                                <span className="ml-1 text-xs text-slate-400">({c.taxIdType})</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {c.email && <p>{c.email}</p>}
                          {c.phone && <p className="text-slate-500">{c.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {c.address ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {c.totalOrders > 0 ? c.totalSpent : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            label={c.isActive ? 'Activo' : 'Inactivo'}
                            variant={c.isActive ? 'success' : 'neutral'}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to="/customers/$id"
                              params={{ id: c.id }}
                              className="text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                              Editar
                            </Link>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setCustomerToDelete(c);
                                }}
                                className="text-sm font-medium text-red-600 hover:text-red-700"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
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
                    {listQuery.data.meta.total} clientes
                  </p>
                  <div className="flex items-center gap-2">
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

      <ConfirmDialog
        open={customerToDelete !== null}
        title="Eliminar cliente"
        message={
          <div>
            <p>
              ¿Eliminar a <strong>{customerToDelete?.name}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Soft delete: el cliente deja de aparecer pero su historial de órdenes
              se preserva.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          </div>
        }
        confirmText="Eliminar"
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          setCustomerToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (customerToDelete) deleteMutation.mutate(customerToDelete.id);
        }}
      />
    </div>
  );
}
