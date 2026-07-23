import { type UserDTO, type PaginatedResponseDTO } from '@saas/shared';
import { api } from './index';

export interface UserFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const usersApi = {
  create: (data: { email: string; fullName: string; password: string; role: string; phone?: string; defaultBranchId?: string; branchIds?: string[] }) =>
    api<UserDTO>('/users', { method: 'POST', body: data }),

  list: (filters: UserFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.search) params.set('search', filters.search);
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    const qs = params.toString();
    return api<PaginatedResponseDTO<UserDTO>>(`/users${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getById: (id: string) => api<UserDTO>(`/users/${id}`, { method: 'GET' }),

  update: (id: string, data: { email?: string; fullName?: string; role?: string; phone?: string; defaultBranchId?: string | null; branchIds?: string[] }) =>
    api<UserDTO>(`/users/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<{ id: string; status: string }>(`/users/${id}`, { method: 'DELETE' }),
};
