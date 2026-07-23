import { type CategoryDTO, type CategoryListItemDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible alias */
export type Category = CategoryDTO;

export interface CategoryFilters {
  isActive?: boolean;
  branchId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  branchId?: string;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export const categoriesApi = {
  list: (filters: CategoryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<CategoryDTO>>(`/categories${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { isActive?: boolean; branchId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<CategoryListItemDTO>>(`/categories/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<CategoryDTO>(`/categories/${id}`, { method: 'GET' }),

  create: (data: CreateCategoryInput) =>
    api<CategoryDTO>('/categories', { method: 'POST', body: data }),

  update: (id: string, data: UpdateCategoryInput) =>
    api<CategoryDTO>(`/categories/${id}`, { method: 'PATCH', body: data }),

  reorder: (items: { id: string; displayOrder: number }[]) =>
    api<void>('/categories/reorder', { method: 'PATCH', body: { items } }),

  remove: (id: string) => api<void>(`/categories/${id}`, { method: 'DELETE' }),
};
