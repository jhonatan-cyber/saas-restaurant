import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { inventoryApi, productsApi, type InventoryFilters } from '~/lib/api';
import { RoutePending, StatusBadge } from '~/components';

export const Route = createFileRoute('/_authed/inventory')({
  component: InventoryPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  INITIAL: 'Stock inicial',
};

const TYPE_VARIANTS: Record<string, 'success' | 'danger' | 'info'> = {
  IN: 'success',
  OUT: 'danger',
  INITIAL: 'info',
};

function InventoryPage(): ReactNode {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<InventoryFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    productSearch: '',
    branchId: 'branch-1',
    type: 'IN' as 'IN' | 'OUT',
    quantity: 0,
    reason: '',
  });
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements', filters],
    queryFn: () => inventoryApi.listMovements(filters),
  });

  const lowStockQuery = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'list', { search: adjustForm.productSearch || undefined }],
    queryFn: () => productsApi.list({ search: adjustForm.productSearch || undefined }),
    enabled: showAdjust && adjustForm.productSearch.length >= 0,
  });

  const adjustMutation = useMutation({
    mutationFn: (input: { productId: string; branchId: string; type: 'IN' | 'OUT'; quantity: number; reason: string }) =>
      inventoryApi.adjustStock(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowAdjust(false);
      setAdjustForm({ productId: '', productSearch: '', branchId: 'branch-1', type: 'IN', quantity: 0, reason: '' });
      setAdjustError(null);
    },
    onError: (err: any) => {
      setAdjustError(err?.message || 'Error al realizar el ajuste');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    if (!adjustForm.productId) {
      setAdjustError('Seleccioná un producto');
      return;
    }
    if (adjustForm.quantity <= 0) {
      setAdjustError('La cantidad debe ser mayor a 0');
      return;
    }
    if (!adjustForm.reason.trim()) {
      setAdjustError('El motivo es obligatorio');
      return;
    }
    adjustMutation.mutate({
      productId: adjustForm.productId,
      branchId: adjustForm.branchId,
      type: adjustForm.type,
      quantity: adjustForm.quantity,
      reason: adjustForm.reason.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500 mt-1">Movimientos de stock y control de inventario</p>
        </div>
        <button
          onClick={() => setShowAdjust(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          + Ajustar stock
        </button>
      </div>

      {/* Modal de ajuste manual */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Ajuste manual de inventario</h2>
              <button onClick={() => { setShowAdjust(false); setAdjustError(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Producto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre…"
                  value={adjustForm.productSearch}
                  onChange={(e) => {
                    setAdjustForm((f) => ({ ...f, productSearch: e.target.value, productId: '' }));
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 outline-none"
                />
                {adjustForm.productSearch && productsQuery.data?.data && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    {productsQuery.data.data
                      .filter((p) => p.name.toLowerCase().includes(adjustForm.productSearch.toLowerCase()))
                      .slice(0, 8)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${adjustForm.productId === p.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}
                          onClick={() => setAdjustForm((f) => ({ ...f, productId: p.id, productSearch: p.name }))}
                        >
                          {p.name} — {p.price}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${adjustForm.type === 'IN' ? 'bg-green-100 text-green-700 ring-2 ring-green-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    onClick={() => setAdjustForm((f) => ({ ...f, type: 'IN' }))}
                  >
                    + Entrada
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${adjustForm.type === 'OUT' ? 'bg-red-100 text-red-700 ring-2 ring-red-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    onClick={() => setAdjustForm((f) => ({ ...f, type: 'OUT' }))}
                  >
                    - Salida
                  </button>
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={adjustForm.quantity || ''}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 outline-none"
                  required
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                <textarea
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 outline-none resize-none"
                  placeholder="Ej: Rotura de stock, ajuste por inventario físico…"
                  required
                />
              </div>

              {adjustError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{adjustError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdjust(false); setAdjustError(null); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {adjustMutation.isPending ? 'Ajustando…' : 'Guardar ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alertas de stock bajo */}
      {lowStockQuery.data && lowStockQuery.data.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
          <h2 className="text-sm font-semibold text-amber-800 mb-2">
            ⚠️ Productos con stock bajo ({lowStockQuery.data.length})
          </h2>
          <div className="space-y-1">
            {lowStockQuery.data.map((p) => (
              <div key={p.id} className="text-sm text-amber-700 flex justify-between">
                <span>{p.name}</span>
                <span className="font-medium">
                  Stock: {Number(p.currentStock).toFixed(2)} / Mín: {p.minStock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockQuery.data && lowStockQuery.data.length === 0 && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-700">✅ Todos los productos tienen stock suficiente</p>
        </div>
      )}

      {/* Movimientos */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Movimientos de inventario</h2>
        </div>

        {movementsQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando…</div>
        ) : movementsQuery.error ? (
          <div className="p-8 text-center text-red-600">Error: {String(movementsQuery.error)}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {movementsQuery.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No hay movimientos de inventario.
                      </td>
                    </tr>
                  )}
                  {movementsQuery.data?.data.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {m.productName ?? m.productId}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={TYPE_LABELS[m.type] ?? m.type}
                          variant={TYPE_VARIANTS[m.type] ?? 'neutral'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium"
                        style={{ color: m.type === 'OUT' ? '#404040' : '#171717' }}
                      >
                        {m.type === 'OUT' ? '-' : '+'}{Number(m.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {Number(m.runningBalance).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {m.referenceId ? (
                          <Link
                            to="/purchases/$id"
                            params={{ id: m.referenceId }}
                            className="text-slate-600 hover:text-slate-800"
                          >
                            {m.referenceType} #{m.referenceId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {movementsQuery.data && movementsQuery.data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <p className="text-slate-600">
                  Página {movementsQuery.data.meta.page} de {movementsQuery.data.meta.totalPages}
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
                    disabled={filters.page === movementsQuery.data.meta.totalPages}
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
    </div>
  );
}
