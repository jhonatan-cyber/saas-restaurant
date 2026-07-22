import { type PurchaseDTO, type PurchaseItemDTO, type PurchaseListItemDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

export type Purchase = PurchaseDTO;
export type PurchaseItem = PurchaseItemDTO;
export type PurchaseListItem = PurchaseListItemDTO;

export interface PurchaseFilters {
  branchId?: string;
  supplierId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePurchaseInput {
  branchId: string;
  supplierId?: string;
  purchaseNumber: string;
  notes?: string;
  taxTotal?: number;
  items: { productId: string; quantity: number; unitCost: number }[];
}

export const purchasesApi = {
  list: (filters: PurchaseFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.supplierId) params.set('supplierId', filters.supplierId);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<PurchaseListItemDTO>>(`/purchases${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<PurchaseDTO>(`/purchases/${id}`, { method: 'GET' }),

  create: (data: CreatePurchaseInput) =>
    api<PurchaseDTO>('/purchases', { method: 'POST', body: data }),

  update: (id: string, data: { purchaseNumber?: string; notes?: string | null }) =>
    api<PurchaseDTO>(`/purchases/${id}`, { method: 'PATCH', body: data }),

  complete: (id: string, receivedAt?: string) =>
    api<PurchaseDTO>(`/purchases/${id}/complete`, { method: 'POST', body: receivedAt ? { receivedAt } : {} }),

  cancel: (id: string) =>
    api<PurchaseDTO>(`/purchases/${id}/cancel`, { method: 'POST' }),
};
