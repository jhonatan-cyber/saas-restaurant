import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  productsApi,
  categoriesApi,
  ApiClientError,
  type Product,
  type ProductFilters,
} from '~/lib/api';
import { PRODUCT_TYPE_LABELS } from '@saas/shared';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog } from '~/components/confirm-dialog';
import { StatusBadge } from '~/components/status-badge';

export const Route = createFileRoute('/_authed/products')({
  component: ProductsListPage,
});

const PAGE_SIZE = 20;

function ProductsListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    categoryId: undefined,
    productType: undefined,
    isActive: undefined,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list(filters),
  });

  // Categorías para el filtro
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', { all: true }],
    queryFn: () => categoriesApi.all({ isActive: true }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductToDelete(null);
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
          <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Catálogo de platos, bebidas, adicionales y servicios
          </p>
        </div>
        {canWrite && (
          <Link to="/products/new" className="btn-primary">
            + Nuevo producto
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2 flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre, SKU, descripción…"
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
            value={filters.categoryId ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                categoryId: e.target.value === '' ? undefined : e.target.value,
                page: 1,
              }))
            }
          >
            <option value="">Todas las categorías</option>
            {categoriesData?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.productType ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                productType:
                  e.target.value === ''
                    ? undefined
                    : (e.target.value as ProductFilters['productType']),
                page: 1,
              }))
            }
          >
            <option value="">Todos los tipos</option>
            {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {listQuery.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No hay productos con esos filtros.
                      </td>
                    </tr>
                  )}
                  {listQuery.data?.data.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{p.name}</p>
                        {p.preparationArea && (
                          <p className="text-xs text-slate-500">
                            → {p.preparationArea.name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <code className="text-xs">{p.sku ?? '—'}</code>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.category?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {PRODUCT_TYPE_LABELS[p.productType]}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {p.price}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge
                            label={p.isActive ? 'Activo' : 'Inactivo'}
                            variant={p.isActive ? 'success' : 'neutral'}
                          />
                          {!p.isAvailable && (
                            <StatusBadge label="No disponible" variant="warning" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canWrite && (
                            <>
                              <Link
                                to="/products/$id"
                                params={{ id: p.id }}
                                className="text-sm font-medium text-brand-600 hover:text-brand-700"
                              >
                                Editar
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setProductToDelete(p);
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
                  {listQuery.data.meta.total} productos
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
        open={productToDelete !== null}
        title="Eliminar producto"
        message={
          <div>
            <p>
              ¿Eliminar <strong>{productToDelete?.name}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Se hace soft delete (el producto deja de aparecer en el POS y reportes).
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          </div>
        }
        confirmText="Eliminar"
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          setProductToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (productToDelete) deleteMutation.mutate(productToDelete.id);
        }}
      />
    </div>
  );
}
