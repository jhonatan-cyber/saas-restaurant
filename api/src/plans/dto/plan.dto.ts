import type { BillingPeriod } from '@saas/shared';

export interface CreatePlanDto {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingPeriod: BillingPeriod | string;
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

export type UpdatePlanDto = Partial<CreatePlanDto>;

export interface PlanFiltersDto {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}
