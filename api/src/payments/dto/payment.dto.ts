import { PaymentMethod, type CreatePaymentsInput, type PreviewChangeInput } from '@saas/shared';

export const PAYMENT_METHODS = Object.values(PaymentMethod) as PaymentMethod[];
export type PaymentMethodInput = PaymentMethod;
export interface PaymentItemDto {
  method: PaymentMethod;
  amount: number;
  tendered?: number;
  change?: number;
  reference?: string;
}
export type CreatePaymentsDto = CreatePaymentsInput;
export type PreviewChangeDto = PreviewChangeInput;
