import { type InventoryMovementDTO, type InventoryKardexDTO, type LowStockProductDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible alias */
export type InventoryMovement = InventoryMovementDTO;

export interface InventoryFilters {
  productId?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export interface AdjustInventoryInput {
  productId: string;
  branchId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
}

export const inventoryApi = {
  listMovements: (filters: InventoryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<InventoryMovementDTO>>(`/inventory/movements${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getKardex: (productId: string, branchId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    return api<InventoryKardexDTO>(`/inventory/kardex/${productId}${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getLowStock: (branchId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    return api<LowStockProductDTO[]>(`/inventory/low-stock${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  adjustStock: (input: AdjustInventoryInput) => {
    return api<{ id: string; productId: string; quantity: string; runningBalance: string; type: string }>('/inventory/adjust', {
      method: 'POST',
      body: input,
    });
  },
};
