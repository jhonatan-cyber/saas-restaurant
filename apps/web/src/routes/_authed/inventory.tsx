import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { inventoryApi, type InventoryFilters } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

export const Route = createFileRoute('/_authed/inventory')({
  component: InventoryPage,
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
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1,
    pageSize: PAGE_SIZE,
  });

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements', filters],
    queryFn: () => inventoryApi.listMovements(filters),
  });

  const lowStockQuery = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventario</h1>
        <p className="text-sm text-slate-500 mt-1">
          Movimientos de stock y control de inventario
        </p>
      </div>

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
                        style={{ color: m.type === 'OUT' ? '#dc2626' : '#16a34a' }}
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
                            className="text-brand-600 hover:text-brand-700"
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
