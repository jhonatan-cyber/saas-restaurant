import type { DashboardMetrics } from '~/lib/api';

interface TopProductsListProps {
  items: DashboardMetrics['topProducts']['items'];
  isLoading?: boolean;
  total: number;
}

export function TopProductsList({ items, isLoading, total }: TopProductsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
        Sin ventas hoy
      </div>
    );
  }

  const maxQty = Math.max(...items.map((i) => i.quantity), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Producto</span>
        <span>Cant.</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.productId ?? item.productName} className="group">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-sm text-slate-700 truncate flex-1">{item.productName}</span>
              <span className="text-sm font-semibold text-slate-900 ml-2">{item.quantity}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-slate-500 to-slate-700 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(item.quantity / maxQty) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-right pt-1">
        {total} productos vendidos hoy
      </p>
    </div>
  );
}
