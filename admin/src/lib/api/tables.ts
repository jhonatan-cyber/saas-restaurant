import { type TableDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible alias */
export type RestaurantTable = TableDTO;

export interface TableFilters {
  branchId?: string;
  status?: 'FREE' | 'OCCUPIED' | 'RESERVED';
  location?: 'INDOOR' | 'OUTDOOR' | 'BAR' | 'PATIO' | 'TERRACE' | 'OTHER';
  page?: number;
  pageSize?: number;
}

export interface CreateTableInput {
  branchId: string;
  number: string;
  capacity?: number;
  location?: 'INDOOR' | 'OUTDOOR' | 'BAR' | 'PATIO' | 'TERRACE' | 'OTHER';
  displayOrder?: number;
  notes?: string;
  posX?: number;
  posY?: number;
}

export type UpdateTableInput = Omit<Partial<CreateTableInput>, 'branchId'>;

export const tablesApi = {
  list: (filters: TableFilters = {}, branchId?: string) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.status) params.set('status', filters.status);
    if (filters.location) params.set('location', filters.location);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<TableDTO>>(`/tables${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  all: (branchId?: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (page) params.set('page', String(page));
    if (pageSize) params.set('pageSize', String(pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<TableDTO>>(`/tables/all${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  get: (id: string) => api<TableDTO>(`/tables/${id}`, { method: 'GET' }),

  create: (data: CreateTableInput) =>
    api<TableDTO>('/tables', { method: 'POST', body: data }),

  update: (id: string, data: UpdateTableInput) =>
    api<TableDTO>(`/tables/${id}`, { method: 'PATCH', body: data }),

  changeStatus: (id: string, status: 'FREE' | 'OCCUPIED' | 'RESERVED', reason?: string) =>
    api<TableDTO>(`/tables/${id}/status`, {
      method: 'PATCH',
      body: { status, ...(reason ? { reason } : {}) },
    }),

  remove: (id: string) => api<void>(`/tables/${id}`, { method: 'DELETE' }),
};
