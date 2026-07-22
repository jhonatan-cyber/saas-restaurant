import { type SupplierDTO, type SupplierListItemDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible aliases */
export type Supplier = SupplierDTO;
export type SupplierListItem = SupplierListItemDTO;

export interface SupplierFilters {
  isActive?: boolean;
  search?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSupplierInput {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
  branchId?: string;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export const suppliersApi = {
  list: (filters: SupplierFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.search) params.set('search', filters.search);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<SupplierDTO>>(`/suppliers${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { isActive?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<SupplierListItemDTO>>(`/suppliers/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<SupplierDTO>(`/suppliers/${id}`, { method: 'GET' }),

  create: (data: CreateSupplierInput) =>
    api<SupplierDTO>('/suppliers', { method: 'POST', body: data }),

  update: (id: string, data: UpdateSupplierInput) =>
    api<SupplierDTO>(`/suppliers/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/suppliers/${id}`, { method: 'DELETE' }),
};
