import {
  type CreatePurchaseInput,
  type PurchaseFiltersInput,
  type UpdatePurchaseInput,
} from '@saas/shared';

export type CreatePurchaseItemDto = CreatePurchaseInput['items'][number];
export type CreatePurchaseDto = CreatePurchaseInput;
export type UpdatePurchaseDto = UpdatePurchaseInput;
export type PurchaseFiltersDto = PurchaseFiltersInput;
