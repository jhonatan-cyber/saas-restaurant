import { type CashRegisterDTO, type ShiftDetailDTO, type ArqueoDTO, type OpenShiftInput, type CloseShiftInput, type CreateCashRegisterInput } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

export interface CashRegisterListItem {
  id: string;
  code: string;
  name: string;
  branchId: string;
  status: 'OPEN' | 'CLOSED';
  isPrimary: boolean;
}

export interface ShiftListItem {
  id: string;
  branchId: string;
  cashRegisterId: string;
  userId: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  openingAmount: string;
  closingAmount: string | null;
  difference: string | null;
}

export const cashApi = {
  listRegisters: (branchId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    return api<CashRegisterListItem[]>(`/cash/registers${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  createRegister: (data: CreateCashRegisterInput) =>
    api<CashRegisterDTO>('/cash/registers', { method: 'POST', body: data }),

  getCurrentShift: (branchId: string) =>
    api<ShiftDetailDTO | null>(`/cash/shifts/current?branchId=${branchId}`, {
      method: 'GET',
      branchId,
    }),

  openShift: (data: OpenShiftInput, branchId: string) =>
    api<ShiftDetailDTO>('/cash/shifts/open', { method: 'POST', body: data, branchId }),

  closeShift: (id: string, data: CloseShiftInput, branchId: string) =>
    api<ShiftDetailDTO>(`/cash/shifts/${id}/close`, {
      method: 'POST',
      body: data,
      branchId,
    }),

  getArqueo: (id: string, branchId: string) =>
    api<ArqueoDTO>(`/cash/shifts/${id}/arqueo`, { method: 'GET', branchId }),

  listShifts: (filters: { branchId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<ShiftListItem>>(`/cash/shifts${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    });
  },
};
