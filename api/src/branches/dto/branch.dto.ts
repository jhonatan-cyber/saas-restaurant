import { BranchStatus } from '@saas/shared';
import type { CreateBranchInput, UpdateBranchInput, BranchFiltersInput } from '@saas/shared';

export type CreateBranchDto = CreateBranchInput;
export type UpdateBranchDto = UpdateBranchInput & { status?: BranchStatus };
export type BranchFiltersDto = BranchFiltersInput;
