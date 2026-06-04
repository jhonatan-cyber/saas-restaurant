import {
  CashMovementCategory,
  CashMovementType,
  type CashMovementFiltersInput,
  type CreateCashMovementInput,
} from '@saas/shared';

export const CASH_MOVEMENT_TYPES = Object.values(CashMovementType) as CashMovementType[];
export const CASH_MOVEMENT_CATEGORIES = Object.values(CashMovementCategory) as CashMovementCategory[];

export type CreateCashMovementDto = CreateCashMovementInput;
export type CashMovementFiltersDto = CashMovementFiltersInput;
