import type { ReactNode } from 'react';
import type { OrderItem } from '~/lib/api';

interface OrderItemsTableProps {
  items: OrderItem[];
}

export function OrderItemsTable({ items }: OrderItemsTableProps): ReactNode {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Ítems ({items.length})
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3 text-right">Cant.</th>
            <th className="px-4 py-3 text-right">P. unit.</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{it.productName}</p>
                {it.preparationAreaName && (
                  <p className="text-xs text-slate-500">→ {it.preparationAreaName}</p>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{it.quantity}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                Bs {Number(it.unitPrice).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                Bs {Number(it.lineTotal).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-xs italic text-slate-600">
                {it.notes ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
