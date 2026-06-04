import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { branchesApi, ApiClientError, type Branch, type BranchFilters } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog } from '~/components/confirm-dialog';
import { StatusBadge } from '~/components/status-badge';

export const Route = createFileRoute('/_authed/branches')({
  component: BranchesListPage,
});

const PAGE_SIZE = 20;

function BranchesListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<BranchFilters>({
    isActive: undefined,
    search: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');
  const [branchToDeactivate, setBranchToDeactivate] = useState<Branch | null>(null);
  const [branchToReactivate, setBranchToReactivate] = useState<Branch | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['branches', filters],
    queryFn: () => branchesApi.list(filters),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => branchesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      setBranchToDeactivate(null);
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al desactivar';
      setActionError(msg);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => branchesApi.reactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      setBranchToReactivate(null);
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al reactivar';
      setActionError(msg);
    },
  });

  const handleSearch = (): void => {
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const canWrite = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sucursales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona las sucursales o puntos de venta de tu negocio
          </p>
        </div>
        {canWrite && (
          <Link to="/branches/new" className="btn-primary">
            + Nueva sucursal
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre…"
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
            <option value="">Todos los estados</option>
            <option value="true">Solo activas</option>
            <option value="false">Solo inactivas</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando…</div>
        ) : listQuery.error ? (
          <div className="p-8 text-center text-red-600">
            Error al cargar: {String(listQuery.error)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Principal</th>
                    <th className="px-4 py-3 text-center">Prod.</th>
                    <th className="px-4 py-3 text-center">Mesas</th>
                    <th className="px-4 py-3 text-center">Órdenes</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {listQuery.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No hay sucursales. Crea la primera.
                      </td>
                    </tr>
                  )}
                  {listQuery.data?.data.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{b.name}</p>
                        {b.address && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{b.address}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {b.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {b.isMain ? (
                          <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                            Principal
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {b.productsCount}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {b.tablesCount}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {b.activeOrdersCount > 0 ? (
                          <span className="font-medium text-amber-600">{b.activeOrdersCount}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={b.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                          variant={b.status === 'ACTIVE' ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canWrite && (
                            <>
                              <Link
                                to="/branches/$id"
                                params={{ id: b.id }}
                                className="text-sm font-medium text-brand-600 hover:text-brand-700"
                              >
                                Editar
                              </Link>
                              {b.status === 'ACTIVE' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionError(null);
                                    setBranchToDeactivate(b);
                                  }}
                                  className="text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                  Desactivar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionError(null);
                                    setBranchToReactivate(b);
                                  }}
                                  className="text-sm font-medium text-green-600 hover:text-green-700"
                                >
                                  Reactivar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginación */}
            {listQuery.data && listQuery.data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <p className="text-slate-600">
                  Página {listQuery.data.meta.page} de {listQuery.data.meta.totalPages} ·{' '}
                  {listQuery.data.meta.total} sucursales
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
      </div>

      {/* Dialog desactivar */}
      <ConfirmDialog
        open={branchToDeactivate !== null}
        title="Desactivar sucursal"
        message={
          <div>
            <p>
              ¿Desactivar <strong>{branchToDeactivate?.name}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              La sucursal quedará inactiva. No se podrá desactivar si tiene órdenes en progreso,
              cajas abiertas, turnos abiertos o estaciones POS activas.
            </p>
            {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
          </div>
        }
        confirmText="Desactivar"
        isLoading={deactivateMutation.isPending}
        onCancel={() => {
          setBranchToDeactivate(null);
          setActionError(null);
        }}
        onConfirm={() => {
          if (branchToDeactivate) deactivateMutation.mutate(branchToDeactivate.id);
        }}
      />

      {/* Dialog reactivar */}
      <ConfirmDialog
        open={branchToReactivate !== null}
        title="Reactivar sucursal"
        message={
          <div>
            <p>
              ¿Reactivar <strong>{branchToReactivate?.name}</strong>?
            </p>
            {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
          </div>
        }
        confirmText="Reactivar"
        isLoading={reactivateMutation.isPending}
        onCancel={() => {
          setBranchToReactivate(null);
          setActionError(null);
        }}
        onConfirm={() => {
          if (branchToReactivate) reactivateMutation.mutate(branchToReactivate.id);
        }}
      />
    </div>
  );
}
