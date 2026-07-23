import { type CashMovementDTO, type CashMovementSummaryDTO, type CreateCashMovementInput } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

export interface CashMovementFilters {
  branchId?: string;
  shiftId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const cashMovementsApi = {
  create: (data: CreateCashMovementInput) =>
    api<CashMovementDTO>('/cash-movements', { method: 'POST', body: data }),

  list: (filters: CashMovementFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.shiftId) params.set('shiftId', filters.shiftId);
    if (filters.type) params.set('type', filters.type);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<CashMovementDTO>>(`/cash-movements${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    });
  },

  getSummary: (filters: { branchId: string; shiftId?: string }) => {
    const params = new URLSearchParams();
    params.set('branchId', filters.branchId);
    if (filters.shiftId) params.set('shiftId', filters.shiftId);
    return api<CashMovementSummaryDTO>(`/cash-movements/summary?${params.toString()}`, {
      method: 'GET',
      branchId: filters.branchId,
    });
  },
};
