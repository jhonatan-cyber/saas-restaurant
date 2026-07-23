import type { ReactNode } from 'react';
import type { Order } from '~/lib/api';

interface OrderTotalsCardProps {
  order: Order;
}

export function OrderTotalsCard({ order }: OrderTotalsCardProps): ReactNode {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-slate-900">Totales</h2>
      <div className="mt-3 space-y-1 text-sm">
        <Row label="Subtotal" value={`Bs ${Number(order.subtotal).toFixed(2)}`} />
        <Row label="Impuestos" value={`Bs ${Number(order.taxTotal).toFixed(2)}`} />
        <Row
          label="Total"
          value={`Bs ${Number(order.total).toFixed(2)}`}
          bold
        />
        <p className="pt-1 text-xs text-slate-500">Versión: {order.version}</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}): ReactNode {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? 'border-t border-slate-200 pt-2 text-base font-bold text-slate-900' : 'text-slate-600'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
