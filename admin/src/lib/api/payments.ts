import { type PaymentDTO, type PayOrderResultDTO, type CreatePaymentsInput } from '@saas/shared';
import { api } from './index';

export interface Payment {
  id: string;
  method: string;
  amount: string;
  tendered: string | null;
  change: string | null;
  reference: string | null;
  createdAt: string;
}

export const paymentsApi = {
  payOrder: (orderId: string, data: CreatePaymentsInput, branchId: string) =>
    api<PayOrderResultDTO>(`/payments/orders/${orderId}`, {
      method: 'POST',
      body: data,
      branchId,
    }),

  listForOrder: (orderId: string) =>
    api<PaymentDTO[]>(`/payments/orders/${orderId}`, { method: 'GET' }),

  previewChange: (data: { amount: number; tendered: number }, branchId: string) =>
    api<{ change: number; tendered: number; amount: number }>('/payments/preview-change', {
      method: 'POST',
      body: data,
      branchId,
    }),
};
