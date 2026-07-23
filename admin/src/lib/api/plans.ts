/**
 * API de planes.
 */
import { apiRequest } from './client';
import type { PlanItem, PlanFilters, PaginatedResponse } from './types';

export const plansApi = {
  list: (filters?: PlanFilters) => {
    const q = new URLSearchParams();
    if (filters?.page) q.set('page', String(filters.page));
    if (filters?.pageSize) q.set('pageSize', String(filters.pageSize));
    if (filters?.search) q.set('search', filters.search);
    if (filters?.isActive !== undefined) q.set('isActive', String(filters.isActive));
    return apiRequest<PaginatedResponse<PlanItem>>(`/plans?${q}`);
  },

  getById: (id: string) =>
    apiRequest<PlanItem>(`/plans/${id}`),

  create: (data: Record<string, unknown>) =>
    apiRequest<PlanItem>('/plans', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    apiRequest<PlanItem>(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id: string) =>
    apiRequest<void>(`/plans/${id}`, { method: 'DELETE' }),
};