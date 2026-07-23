/**
 * Barrel exports para utilidades del admin.
 *
 * Uso:
 *   import { authApi, adminApi, plansApi, apiRequest, getCurrentUser, setCurrentUser, initCsrf } from '~/lib';
 *   import type { AuthUser, PlanItem, BusinessListItem, ... } from '~/lib';
 */
export {
  apiRequest,
  getCurrentUser,
  setCurrentUser,
  initCsrf,
  authApi,
  adminApi,
  plansApi,
} from './api/index';

export type {
  AuthUser,
  DashboardStats,
  DashboardSeriesItem,
  BusinessListItem,
  BusinessDetail,
  SubscriptionItem,
  AuditLogItem,
  SaaSUserItem,
  PlanItem,
  CreatePlanInput,
  UpdatePlanInput,
  PaginatedResponse,
  PlanFilters,
  BusinessListParams,
  SubscriptionListParams,
  AuditLogListParams,
} from './api/index';
