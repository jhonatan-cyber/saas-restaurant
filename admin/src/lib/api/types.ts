/**
 * Tipos compartidos para el panel Admin (SaaS).
 */

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface DashboardStats {
  totalBusinesses: number;
  totalUsers: number;
  totalOrders: number;
  activeSubscriptions: number;
}

export interface DashboardSeriesItem {
  month: string;
  businesses: number;
  orders: number;
  revenue: number;
}

export interface BusinessListItem {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
  plan: string;
  planCode: string | null;
  subscriptionStatus: string | null;
  usersCount: number;
  branchesCount: number;
  ordersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDetail {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  taxId: string | null;
  email: string;
  phone: string | null;
  currency: string;
  timezone: string;
  status: string;
  subscription: {
    id: string;
    plan: string | null;
    planCode: string | null;
    planId: string | null;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  stats: {
    users: number;
    branches: number;
    orders: number;
    products: number;
    customers: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionItem {
  id: string;
  businessId: string;
  business: { id: string; name: string; slug: string; email: string; status: string };
  planId: string;
  plan: { id: string; name: string; code: string; price: string; billingPeriod: string };
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  businessId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export interface SaaSUserItem {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface PlanFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface PlanItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  billingPeriod: string;
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  maxCategories: number;
  maxMonthlyOrders: number;
  maxStorageMb: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanInput {
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
}

export type UpdatePlanInput = Partial<CreatePlanInput>;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface BusinessListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  planCode?: string;
}

export interface SubscriptionListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  planId?: string;
}

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  action?: string;
  entity?: string;
}