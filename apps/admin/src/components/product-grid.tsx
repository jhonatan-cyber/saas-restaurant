import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, productsApi } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

/**
 * Lo que el grid entrega al cart al hacer click.
 * Trae TODOS los datos del snapshot (price, taxRate, preparationAreaId)
 * para que la orden no tenga que re-fetchear el producto.
 */
export interface AddableProduct {
  id: string;
  name: string;
  price: string;
  taxRate: string | null;
  preparationAreaId: string | null;
  preparationAreaName: string | null;
}

interface ProductGridProps {
  onAdd: (product: AddableProduct) => void;
  branchId: string;
}

/**
 * Grid de productos para el POS.
 * - Filtro por categoría (chips horizontales).
 * - Carga hasta 100 productos disponibles (suficiente para una pantalla POS).
 * - Click en una card → onAdd(product).
 * - Productos no disponibles se muestran deshabilitados.
 */
export function ProductGrid({ onAdd, branchId }: ProductGridProps): ReactNode {
  const user = useAuthStore((s) => s.user);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'all', { isActive: true, branchId }],
    queryFn: () => categoriesApi.all({ isActive: true, branchId }),
    select: (res) => res.data,
    enabled: !!branchId,
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'list', { isAvailable: true, categoryId: categoryFilter, pageSize: 100 }],
    queryFn: () =>
      productsApi.list({
        isAvailable: true,
        categoryId: categoryFilter ?? undefined,
        pageSize: 100,
      }),
    enabled: !!user,
  });

  const products = productsQuery.data?.data ?? [];
  const categories = categoriesQuery.data ?? [];

  return (
    <div className="space-y-4">
      {/* Filtro por categoría */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Categoría
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === null
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === c.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de productos */}
      {productsQuery.isLoading ? (
        <div className="card p-8 text-center text-slate-500">Cargando productos…</div>
      ) : productsQuery.error ? (
        <div className="card p-8 text-center text-red-600">
          Error al cargar productos
        </div>
      ) : products.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No hay productos disponibles
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const disabled = !p.isAvailable;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onAdd({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    taxRate: p.taxRate,
                    preparationAreaId: p.preparationAreaId,
                    preparationAreaName: p.preparationArea?.name ?? null,
                  })
                }
                className={`card flex flex-col items-start gap-1 p-3 text-left transition-all ${
                  disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:border-brand-300 hover:shadow-sm active:scale-[0.98]'
                }`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {p.name}
                  </p>
                  {disabled && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      Sin stock
                    </span>
                  )}
                </div>
                <p className="mt-auto text-base font-bold text-brand-700">
                  Bs {Number(p.price).toFixed(2)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
