/**
 * API para el panel de administración (SaaS).
 */
import { apiRequest } from './client';
import type {
  DashboardStats,
  DashboardSeriesItem,
  BusinessListItem,
  BusinessDetail,
  SubscriptionItem,
  AuditLogItem,
  SaaSUserItem,
  PaginatedResponse,
  BusinessListParams,
  SubscriptionListParams,
  AuditLogListParams,
} from './types';

export const adminApi = {
  getDashboardStats: () =>
    apiRequest<DashboardStats>('/admin/dashboard/stats'),

  getDashboardSeries: () =>
    apiRequest<DashboardSeriesItem[]>('/admin/dashboard/series'),

  listBusinesses: (params?: BusinessListParams) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.planCode) q.set('planCode', params.planCode);
    return apiRequest<PaginatedResponse<BusinessListItem>>(`/admin/businesses?${q}`);
  },

  getBusinessDetail: (id: string) =>
    apiRequest<BusinessDetail>(`/admin/businesses/${id}`),

  assignPlan: (businessId: string, planId: string) =>
    apiRequest<Record<string, unknown>>(`/admin/businesses/${businessId}/assign-plan`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  cancelSubscription: (businessId: string) =>
    apiRequest<Record<string, unknown>>(`/admin/businesses/${businessId}/cancel-subscription`, {
      method: 'POST',
    }),

  updateBusiness: (id: string, data: { name?: string; email?: string; status?: string }) =>
    apiRequest<Record<string, unknown>>(`/admin/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listSaaSUsers: (page = 1, pageSize = 20) =>
    apiRequest<PaginatedResponse<SaaSUserItem>>(
      `/admin/saas-users?page=${page}&pageSize=${pageSize}`,
    ),

  createSaaSUser: (data: { email: string; password: string; role: string }) =>
    apiRequest<SaaSUserItem>('/admin/saas-users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listSubscriptions: (params?: SubscriptionListParams) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.status) q.set('status', params.status);
    if (params?.planId) q.set('planId', params.planId);
    return apiRequest<PaginatedResponse<SubscriptionItem>>(`/admin/subscriptions?${q}`);
  },

  listAuditLogs: (params?: AuditLogListParams) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.action) q.set('action', params.action);
    if (params?.entity) q.set('entity', params.entity);
    return apiRequest<PaginatedResponse<AuditLogItem>>(`/admin/audit-logs?${q}`);
  },
};