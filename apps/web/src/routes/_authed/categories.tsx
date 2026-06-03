import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { categoriesApi, ApiClientError, type Category, type CategoryFilters } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog } from '~/components/confirm-dialog';
import { StatusBadge } from '~/components/status-badge';

export const Route = createFileRoute('/_authed/categories')({
  component: CategoriesListPage,
});

const PAGE_SIZE = 20;

function CategoriesListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<CategoryFilters>({
    isActive: undefined,
    branchId: undefined,
    search: '',
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['categories', filters],
    queryFn: () => categoriesApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryToDelete(null);
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

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; displayOrder: number }[]) =>
      categoriesApi.reorder(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleSearch = (): void => {
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const moveItem = (cat: Category, direction: -1 | 1): void => {
    const list = listQuery.data?.data ?? [];
    const currentIndex = list.findIndex((c) => c.id === cat.id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const next = [...list];
    const tmp = next[currentIndex];
    if (!tmp) return;
    next[currentIndex] = next[targetIndex]!;
    next[targetIndex] = tmp;

    void reorderMutation.mutateAsync(
      next.map((c, idx) => ({ id: c.id, displayOrder: idx })),
    );
  };

  const canWrite = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorías</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organiza tu menú en secciones (entradas, principales, etc.)
          </p>
        </div>
        {canWrite && (
          <Link to="/categories/new" className="btn-primary">
            + Nueva categoría
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2 flex gap-2">
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
                    <th className="px-4 py-3">Orden</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3 text-center">Productos</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {listQuery.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No hay categorías. Crea la primera.
                      </td>
                    </tr>
                  )}
                  {listQuery.data?.data.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">
                        <div className="flex items-center gap-1">
                          <span>{c.displayOrder}</span>
                          {canWrite && (
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => moveItem(c, -1)}
                                className="text-xs text-slate-400 hover:text-slate-700"
                                aria-label="Subir"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(c, 1)}
                                className="text-xs text-slate-400 hover:text-slate-700"
                                aria-label="Bajar"
                              >
                                ▼
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-slate-500">{c.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <code className="text-xs">{c.slug}</code>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {c.productCount}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={c.isActive ? 'Activa' : 'Inactiva'}
                          variant={c.isActive ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canWrite && (
                            <>
                              <Link
                                to="/categories/$id"
                                params={{ id: c.id }}
                                className="text-sm font-medium text-brand-600 hover:text-brand-700"
                              >
                                Editar
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setCategoryToDelete(c);
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
            {/* Paginación */}
            {listQuery.data && listQuery.data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <p className="text-slate-600">
                  Página {listQuery.data.meta.page} de {listQuery.data.meta.totalPages} ·{' '}
                  {listQuery.data.meta.total} categorías
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
        open={categoryToDelete !== null}
        title="Eliminar categoría"
        message={
          <div>
            <p>
              ¿Eliminar <strong>{categoryToDelete?.name}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Esta acción no se puede deshacer. Si la categoría tiene productos activos, no
              se podrá eliminar.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          </div>
        }
        confirmText="Eliminar"
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          setCategoryToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (categoryToDelete) deleteMutation.mutate(categoryToDelete.id);
        }}
      />
    </div>
  );
}
