import { type UpdateOrderItemInput } from '@saas/shared';

export type UpdateOrderItemDto = UpdateOrderItemInput;
export type AddOrderItemDto = {
  productId: string;
  quantity: number;
  notes?: string;
};
