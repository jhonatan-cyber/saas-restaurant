import { type CustomerDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible alias */
export type Customer = CustomerDTO;

export interface CustomerFilters {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCustomerInput {
  name: string;
  taxId?: string;
  taxIdType?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressReference?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isActive?: boolean;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export const customersApi = {
  list: (filters: CustomerFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<CustomerDTO>>(`/customers${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  search: (q: string, limit = 20) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', String(limit));
    return api<CustomerDTO[]>(`/customers/search?${params.toString()}`, { method: 'GET' });
  },

  get: (id: string) => api<CustomerDTO>(`/customers/${id}`, { method: 'GET' }),

  create: (data: CreateCustomerInput) =>
    api<CustomerDTO>('/customers', { method: 'POST', body: data }),

  update: (id: string, data: UpdateCustomerInput) =>
    api<CustomerDTO>(`/customers/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/customers/${id}`, { method: 'DELETE' }),
};
