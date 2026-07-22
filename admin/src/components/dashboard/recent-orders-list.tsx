import { Link } from '@tanstack/react-router';
import { ORDER_STATUS_LABELS } from '@saas/shared';

interface RecentOrder {
  id: string;
  status: string;
  type: string;
  tableNumber: string | null;
  itemCount: number;
  total: string;
  createdAt: string;
  elapsedMinutes: number;
}

interface RecentOrdersListProps {
  orders: RecentOrder[];
  isLoading?: boolean;
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  SENT_TO_KITCHEN: 'bg-blue-100 text-blue-700',
  IN_PREPARATION: 'bg-orange-100 text-orange-700',
  READY: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-slate-100 text-slate-700',
};

export function RecentOrdersList({ orders, isLoading }: RecentOrdersListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
        No hay órdenes activas
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {orders.map((order) => (
        <Link
          key={order.id}
          to="/orders/$id"
          params={{ id: order.id }}
          className="flex items-center justify-between px-1 py-3 transition-colors hover:bg-slate-50 rounded-lg -mx-1"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              {order.tableNumber ? (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                  {order.tableNumber}
                </span>
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400">
                  {order.type === 'TAKEOUT' ? 'LL' : 'DL'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}
                </span>
                <span className="text-xs text-slate-400">{order.itemCount} items</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ${order.total} · {order.elapsedMinutes > 60
                  ? `${Math.floor(order.elapsedMinutes / 60)}h ${order.elapsedMinutes % 60}m`
                  : `${order.elapsedMinutes}m`}
              </p>
            </div>
          </div>
          <svg className="h-4 w-4 flex-shrink-0 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
