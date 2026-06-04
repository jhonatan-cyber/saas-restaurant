import { BranchStatus, type CreateBranchInput } from '@saas/shared';

export type CreateBranchDto = CreateBranchInput;

export interface UpdateBranchDto {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
  status?: BranchStatus;
}

export interface BranchFiltersDto {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}
