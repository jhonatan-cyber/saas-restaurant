import { type AuditLogDTO } from '@saas/shared';
import { api } from './index';

export type AuditLogEntry = AuditLogDTO;

export interface AuditFilters {
  page?: number;
  pageSize?: number;
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditApi = {
  list: (filters: AuditFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.entity) params.set('entity', filters.entity);
    if (filters.entityId) params.set('entityId', filters.entityId);
    if (filters.action) params.set('action', filters.action);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    const qs = params.toString();
    return api<{
      data: AuditLogDTO[];
      meta: { total: number; page: number; pageSize: number; totalPages: number };
    }>(`/audit${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
};
