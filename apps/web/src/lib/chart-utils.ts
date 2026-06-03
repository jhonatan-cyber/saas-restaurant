/**
 * Helpers para Chart.js — gráficos HTML5 accesibles.
 *
 * Chart.js requiere canvas. Los componentes React que usan estos helpers
 * deben usar <canvas ref={chartRef} /> y llamar a createChart() en useEffect.
 *
 * Patrón de uso:
 *   const chartRef = useRef<HTMLCanvasElement>(null);
 *   useEffect(() => {
 *     if (!chartRef.current) return;
 *     const chart = createSalesChart(chartRef.current, data);
 *     return () => chart.destroy();
 *   }, [data]);
 */
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
  type ChartDataset,
} from 'chart.js';

// Registrar componentes necesarios (solo se registran una vez)
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Defaults globales para toda la app
Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
Chart.defaults.color = '#64748b'; // slate-500
Chart.defaults.plugins.legend.labels.color = '#334155'; // slate-700

/**
 * Dataset para barras de ventas diarias.
 */
export interface DailySalesDataset {
  labels: string[]; // ['Lun 1', 'Mar 2', ...]
  values: number[];
  currency?: string;
}

/**
 * Gráfico de barras: ventas diarias del período.
 */
export function createSalesBarChart(
  canvas: HTMLCanvasElement,
  data: DailySalesDataset,
): Chart {
  const cfg: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Ventas',
          data: data.values,
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y ?? 0;
              return data.currency
                ? new Intl.NumberFormat('es-BO', { style: 'currency', currency: data.currency }).format(val)
                : val.toFixed(2);
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  };
  return new Chart(canvas, cfg);
}

/**
 * Dataset para gráfico de torta / donas de métodos de pago.
 */
export interface PaymentMethodsDataset {
  labels: string[]; // ['Efectivo', 'QR', 'Tarjeta']
  values: number[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * Gráfico de dona: distribución por método de pago.
 */
export function createPaymentMethodsChart(
  canvas: HTMLCanvasElement,
  data: PaymentMethodsDataset,
): Chart {
  const colors = data.colors ?? DEFAULT_COLORS;
  const cfg: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [
        {
          data: data.values,
          backgroundColor: colors.slice(0, data.labels.length),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${pct}%`;
            },
          },
        },
      },
    },
  };
  return new Chart(canvas, cfg);
}

/**
 * Dataset para línea de tendencia (ej: ventas por día, histórico).
 */
export interface TrendDataset {
  labels: string[];
  values: number[];
  label?: string;
}

/**
 * Gráfico de línea con área preenchida para tendencias.
 */
export function createTrendLineChart(
  canvas: HTMLCanvasElement,
  data: TrendDataset,
): Chart {
  const cfg: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: data.label ?? 'Ventas',
          data: data.values,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  };
  return new Chart(canvas, cfg);
}

/**
 * Gráfico de barras apiladas para ventas por categoría.
 */
export interface StackedBarDataset {
  labels: string[];
  datasets: Array<{
    label: string;
    values: number[];
    color?: string;
  }>;
}

export function createStackedBarChart(
  canvas: HTMLCanvasElement,
  data: StackedBarDataset,
): Chart {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const cfg: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.values,
        backgroundColor: ds.color ?? colors[i % colors.length],
        borderRadius: 4,
        borderSkipped: false as const,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
      },
      scales: {
        y: {
          beginAtZero: true,
          stacked: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          stacked: true,
          grid: { display: false },
        },
      },
    },
  };
  return new Chart(canvas, cfg);
}