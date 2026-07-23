import { api } from './index';

// ── Tipos de respuesta del dashboard ────────────────────────────────────────

export interface DashboardMetrics {
  todaySales: {
    total: string;
    count: number;
    average: string;
  };
  todayOrdersCount: {
    total: number;
  };
  activeOrdersByStatus: {
    byStatus: Array<{ status: string; count: number }>;
    total: number;
    recent: Array<{
      id: string;
      status: string;
      type: string;
      tableNumber: string | null;
      itemCount: number;
      total: string;
      createdAt: string;
      elapsedMinutes: number;
    }>;
  };
  weeklySalesTrend: {
    days: Array<{
      label: string;
      date: string;
      total: number;
      count: number;
    }>;
    total: number;
    average: string;
  };
  topProducts: {
    items: Array<{
      productId: string | null;
      productName: string;
      quantity: number;
      total: string;
    }>;
    total: number;
  };
  paymentMethods: {
    methods: Array<{
      method: string;
      amount: string;
      count: number;
      percentage: number;
    }>;
    total: string;
  };
  tablesSummary: {
    total: number;
    free: number;
    occupied: number;
    reserved: number;
  };
  counts: {
    products: number;
    categories: number;
    customers: number;
    users: number;
    lowStock: number;
  };
  generatedAt: string;
}

export const dashboardApi = {
  metrics: (branchId?: string) => {
    const params = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return api<DashboardMetrics>(`/dashboard/metrics${params}`, { method: 'GET' });
  },
};
