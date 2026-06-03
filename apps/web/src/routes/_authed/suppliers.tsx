import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { suppliersApi, ApiClientError, type Supplier, type SupplierFilters } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog } from '~/components/confirm-dialog';
import { StatusBadge } from '~/components/status-badge';

export const Route = createFileRoute('/_authed/suppliers')({
  component: SuppliersListPage,
});

const PAGE_SIZE = 20;

function SuppliersListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<SupplierFilters>({
    isActive: undefined,
    search: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['suppliers', filters],
    queryFn: () => suppliersApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierToDelete(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al eliminar';
      setDeleteError(msg);
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
          <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona tus proveedores de insumos y materias primas
          </p>
        </div>
        {canWrite && (
          <Link to="/suppliers/new" className="btn-primary">
            + Nuevo proveedor
          </Link>
        )}
      </div>

      <div className="card p-4">
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
      </div>

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
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Compras</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {listQuery.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No hay proveedores. Crea el primero.
                      </td>
                    </tr>
                  )}
                  {listQuery.data?.data.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{s.name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.contactName ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.phone ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.email ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{s.purchaseCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={s.isActive ? 'Activo' : 'Inactivo'}
                          variant={s.isActive ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canWrite && (
                            <>
                              <Link
                                to="/suppliers/$id"
                                params={{ id: s.id }}
                                className="text-sm font-medium text-brand-600 hover:text-brand-700"
                              >
                                Editar
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setSupplierToDelete(s);
                                }}
                                className="text-sm font-medium text-red-600 hover:text-red-700"
                              >
                                Eliminar
                              </button>
                            </>
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
                  {listQuery.data.meta.total} proveedores
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

      <ConfirmDialog
        open={supplierToDelete !== null}
        title="Eliminar proveedor"
        message={
          <div>
            <p>
              ¿Eliminar <strong>{supplierToDelete?.name}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500">Esta acción no se puede deshacer.</p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          </div>
        }
        confirmText="Eliminar"
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          setSupplierToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (supplierToDelete) deleteMutation.mutate(supplierToDelete.id);
        }}
      />
    </div>
  );
}
