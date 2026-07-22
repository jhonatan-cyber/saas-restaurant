import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../lib/api';
import type { ComboItemDTO } from '@saas/shared';

interface ComboItemsEditorProps {
  items: Array<{ productId: string; productName: string; quantity: number }>;
  onChange: (items: Array<{ productId: string; productName: string; quantity: number }>) => void;
}

/**
 * Editor de items de combo (F5-01).
 * Se muestra cuando el tipo de producto es COMBO.
 * Permite buscar productos existentes y agregarlos como items del combo.
 */
export function ComboItemsEditor({ items, onChange }: ComboItemsEditorProps): ReactNode {
  const [search, setSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  const productsQuery = useQuery({
    queryKey: ['products', 'list', { search, pageSize: 10 }],
    queryFn: () => productsApi.list({ search: search || undefined, pageSize: 10 }),
    enabled: showProductPicker && search.length >= 0,
  });

  const handleAdd = useCallback(
    (productId: string, productName: string) => {
      if (items.some((i) => i.productId === productId)) return; // ya agregado
      onChange([...items, { productId, productName, quantity: 1 }]);
      setSearch('');
    },
    [items, onChange],
  );

  const handleRemove = useCallback(
    (productId: string) => {
      onChange(items.filter((i) => i.productId !== productId));
    },
    [items, onChange],
  );

  const handleQtyChange = useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) return;
      onChange(items.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    },
    [items, onChange],
  );

  const availableProducts = (productsQuery.data?.data ?? []).filter(
    (p) => !items.some((i) => i.productId === p.id),
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Items del Combo</h3>
          <p className="text-xs text-slate-500">
            Productos incluidos en este combo. Se expandirán al agregarlo al POS.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowProductPicker(true)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
        >
          + Agregar producto
        </button>
      </div>

      {/* Lista de items actuales */}
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">
          No hay productos en este combo. Agregá al menos uno.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {item.productName}
                </p>
                <p className="text-xs text-slate-400">ID: {item.productId.slice(0, 8)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQtyChange(item.productId, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(item.productId, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.productId)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Quitar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Product Picker Modal/Inline */}
      {showProductPicker && (
        <div className="mt-3 rounded-md border border-brand-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Buscar producto
            </span>
            <button
              type="button"
              onClick={() => {
                setShowProductPicker(false);
                setSearch('');
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cerrar
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Escribí el nombre del producto…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 outline-none"
            autoFocus
          />
          {search && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {availableProducts.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  {productsQuery.isLoading
                    ? 'Buscando…'
                    : 'No se encontraron productos'}
                </p>
              ) : (
                availableProducts.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAdd(p.id, p.name)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      Bs {Number(p.price).toFixed(2)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        {items.length > 0
          ? `${items.length} producto(s) en el combo`
          : 'Agregá productos para definir el contenido del combo'}
      </p>
    </div>
  );
}
