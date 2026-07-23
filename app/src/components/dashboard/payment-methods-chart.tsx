import { useRef, useEffect } from 'react';
import { createPaymentMethodsChart } from '~/lib/chart-utils';
import { PAYMENT_METHOD_LABELS } from '@saas/shared';
import type { DashboardMetrics } from '~/lib/api';
import { OrbSpinner } from '@saas/ui';

interface PaymentMethodsChartProps {
  methods: DashboardMetrics['paymentMethods']['methods'];
  total: string;
  isLoading?: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  CASH: '#10b981',
  QR: '#6366f1',
  TRANSFER: '#f59e0b',
  CARD: '#3b82f6',
};

export function PaymentMethodsChart({ methods, total, isLoading }: PaymentMethodsChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current || isLoading || methods.length === 0) return;
    const chart = createPaymentMethodsChart(chartRef.current, {
      labels: methods.map((m) => PAYMENT_METHOD_LABELS[m.method as keyof typeof PAYMENT_METHOD_LABELS] ?? m.method),
      values: methods.map((m) => Number(m.amount)),
      colors: methods.map((m) => METHOD_COLORS[m.method] ?? '#737373'),
    });
    return () => chart.destroy();
  }, [methods, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <OrbSpinner size={64} state="working" speed={1.25} />
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
        Sin pagos hoy
      </div>
    );
  }

  return (
    <div>
      <div className="h-48">
        <canvas ref={chartRef} />
      </div>
      <div className="mt-3 space-y-1.5">
        {methods.map((m) => (
          <div key={m.method} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: METHOD_COLORS[m.method] ?? '#737373' }}
              />
              <span className="text-slate-600">
                {PAYMENT_METHOD_LABELS[m.method as keyof typeof PAYMENT_METHOD_LABELS] ?? m.method}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{m.percentage}%</span>
              <span className="font-medium text-slate-700">${Number(m.amount).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400 text-center">
        Total cobrado: ${Number(total).toFixed(2)}
      </p>
    </div>
  );
}
