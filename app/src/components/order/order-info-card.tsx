import type { ReactNode } from 'react';
import { ORDER_TYPE_LABELS, ORDER_CHANNEL_LABELS } from '@saas/shared';
import type { Order } from '~/lib/api';

interface OrderInfoCardProps {
  order: Order;
}

export function OrderInfoCard({ order }: OrderInfoCardProps): ReactNode {
  return (
    <div className="card p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
        <Field label="Tipo" value={ORDER_TYPE_LABELS[order.type]} />
        <Field
          label="Canal"
          value={ORDER_CHANNEL_LABELS[order.channel] ?? order.channel}
        />
        <Field
          label="Mesa"
          value={order.tableId ? order.tableId.slice(-6) : 'Sin mesa'}
        />
        <Field
          label="Customer"
          value={order.customerId ? order.customerId.slice(-8) : 'Consumidor final'}
        />
        <Field label="Cajero" value={order.cashierId.slice(-8)} />
        {order.waiterId && (
          <Field label="Mesero" value={order.waiterId.slice(-8)} />
        )}
        <Field
          label="Creada"
          value={new Date(order.createdAt).toLocaleString('es-BO')}
        />
        <Field
          label="Actualizada"
          value={new Date(order.updatedAt).toLocaleString('es-BO')}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-900">{value}</p>
    </div>
  );
}
