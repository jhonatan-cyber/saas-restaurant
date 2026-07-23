import { type PlanDTO, type PaginatedResponseDTO } from '@saas/shared';
import { api } from './index';

export interface PlanFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export const plansApi = {
  create: (data: {
    code: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    billingPeriod: string;
    maxUsers: number;
    maxBranches: number;
    maxProducts: number;
    maxCategories: number;
    maxMonthlyOrders: number;
    maxStorageMb: number;
    features?: string[];
    isActive?: boolean;
    sortOrder?: number;
    isPublic?: boolean;
  }) => api<PlanDTO>('/plans', { method: 'POST', body: data }),

  list: (filters: PlanFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.search) params.set('search', filters.search);
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    const qs = params.toString();
    return api<PaginatedResponseDTO<PlanDTO>>(`/plans${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  listPublic: () => api<PlanDTO[]>('/plans/public', { method: 'GET', skipAuth: true }),

  getById: (id: string) => api<PlanDTO>(`/plans/${id}`, { method: 'GET' }),

  update: (id: string, data: Partial<{
    code: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    billingPeriod: string;
    maxUsers: number;
    maxBranches: number;
    maxProducts: number;
    maxCategories: number;
    maxMonthlyOrders: number;
    maxStorageMb: number;
    features?: string[];
    isActive?: boolean;
    sortOrder?: number;
    isPublic?: boolean;
  }>) => api<PlanDTO>(`/plans/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<{ id: string; isActive?: boolean; deleted?: boolean }>(`/plans/${id}`, { method: 'DELETE' }),
};
