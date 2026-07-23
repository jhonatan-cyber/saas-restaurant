import { useRef, useEffect } from 'react';
import { createSalesBarChart, type DailySalesDataset } from '~/lib/chart-utils';
import { OrbSpinner } from '@saas/ui';

interface SalesChartProps {
  data: DailySalesDataset;
  isLoading?: boolean;
  error?: string | null;
}

export function SalesChart({ data, isLoading, error }: SalesChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current || isLoading || error || data.labels.length === 0) return;
    const chart = createSalesBarChart(chartRef.current, data);
    return () => chart.destroy();
  }, [data, isLoading, error]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <OrbSpinner size={64} state="working" speed={1.25} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (data.labels.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Sin datos de ventas en los últimos 7 días
      </div>
    );
  }

  return (
    <div className="h-64">
      <canvas ref={chartRef} />
    </div>
  );
}
