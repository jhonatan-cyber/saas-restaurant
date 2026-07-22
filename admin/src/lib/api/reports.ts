import { type ReportDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

export const ReportType = {
  SALES_DAILY: 'SALES_DAILY',
  SALES_RANGE: 'SALES_RANGE',
  PAYMENT_METHODS: 'PAYMENT_METHODS',
  TOP_PRODUCTS: 'TOP_PRODUCTS',
  GROSS_PROFIT: 'GROSS_PROFIT',
  INVENTORY: 'INVENTORY',
  CLOSE_REPORT: 'CLOSE_REPORT',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const ReportFormat = {
  PDF: 'PDF',
  XLSX: 'XLSX',
} as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

export const ReportStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export type Report = ReportDTO;

export interface ReportFilters {
  status?: ReportStatus;
  type?: ReportType;
  page?: number;
  pageSize?: number;
}

export const reportsApi = {
  list: (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.type) params.set('type', filters.type);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<ReportDTO>>(`/reports${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getById: (id: string) => api<ReportDTO>(`/reports/${id}`, { method: 'GET' }),

  request: (dto: { type: ReportType; format?: ReportFormat; params?: Record<string, unknown> }) =>
    api<ReportDTO>('/reports', { method: 'POST', body: dto }),
};
