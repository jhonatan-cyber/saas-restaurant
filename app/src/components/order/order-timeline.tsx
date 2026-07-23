import type { ReactNode } from 'react';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@saas/shared';
import type { OrderStateLog } from '~/lib/api';

interface OrderTimelineProps {
  logs: OrderStateLog[];
}

export function OrderTimeline({ logs }: OrderTimelineProps): ReactNode {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-slate-900">Historial de estados</h2>
      {logs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Sin cambios registrados.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {logs.map((log) => (
            <li
              key={log.id}
              className="border-l-4 border-slate-300 pl-3 text-sm"
            >
              <p className="font-medium text-slate-900">
                {log.fromStatus
                  ? `${ORDER_STATUS_LABELS[log.fromStatus as OrderStatus] ?? log.fromStatus} → `
                  : ''}
                {ORDER_STATUS_LABELS[log.toStatus as OrderStatus] ?? log.toStatus}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(log.createdAt).toLocaleString('es-BO')} · por{' '}
                {log.changedByUserId.slice(-8)}
              </p>
              {log.reason && (
                <p className="mt-1 text-xs italic text-slate-600">{log.reason}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
