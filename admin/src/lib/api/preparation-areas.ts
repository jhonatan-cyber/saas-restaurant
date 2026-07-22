import { type PreparationAreaDTO, type PreparationAreaListItemDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible alias */
export type PreparationArea = PreparationAreaDTO;

export interface PreparationAreaFilters {
  isActive?: boolean;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePreparationAreaInput {
  name: string;
  code: string;
  description?: string;
  branchId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdatePreparationAreaInput = Partial<CreatePreparationAreaInput>;

export const preparationAreasApi = {
  list: (filters: PreparationAreaFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<PreparationAreaDTO>>(`/preparation-areas${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { isActive?: boolean; branchId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<PreparationAreaListItemDTO>>(`/preparation-areas/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<PreparationAreaDTO>(`/preparation-areas/${id}`, { method: 'GET' }),

  create: (data: CreatePreparationAreaInput) =>
    api<PreparationAreaDTO>('/preparation-areas', { method: 'POST', body: data }),

  update: (id: string, data: UpdatePreparationAreaInput) =>
    api<PreparationAreaDTO>(`/preparation-areas/${id}`, { method: 'PATCH', body: data }),

  reorder: (items: { id: string; displayOrder: number }[]) =>
    api<void>('/preparation-areas/reorder', { method: 'PATCH', body: { items } }),

  remove: (id: string) => api<void>(`/preparation-areas/${id}`, { method: 'DELETE' }),
};
