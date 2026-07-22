import { type BranchDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible aliases */
export type Branch = BranchDTO;

export interface BranchListItem {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
  status: string;
}

export interface BranchFilters {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
}

export type UpdateBranchInput = Partial<CreateBranchInput> & { status?: 'ACTIVE' | 'INACTIVE' };

export const branchesApi = {
  list: (filters: BranchFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<BranchDTO>>(`/branches${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { isActive?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<BranchListItem>>(`/branches/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<BranchDTO>(`/branches/${id}`, { method: 'GET' }),

  create: (data: CreateBranchInput) =>
    api<BranchDTO>('/branches', { method: 'POST', body: data }),

  update: (id: string, data: UpdateBranchInput) =>
    api<BranchDTO>(`/branches/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/branches/${id}`, { method: 'DELETE' }),

  reactivate: (id: string) => api<void>(`/branches/${id}/reactivate`, { method: 'POST' }),
};
