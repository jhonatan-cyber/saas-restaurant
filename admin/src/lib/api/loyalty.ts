import { api } from './index';
import type { CustomerLoyaltyDTO, LoyaltyProgramDTO } from '@saas/shared';

export interface PreviewRedemptionResult {
  points: number;
  discount: number;
  valid: boolean;
  reason?: string;
}

export const loyaltyApi = {
  /** Get/configure the loyalty program for the current business */
  getProgram: () => api<LoyaltyProgramDTO>('/loyalty/program', { method: 'GET' }),

  /** Update loyalty program settings */
  updateProgram: (data: Partial<LoyaltyProgramDTO>) =>
    api<LoyaltyProgramDTO>('/loyalty/program', { method: 'PUT', body: data }),

  /** Get customer loyalty info (points, program, max redeemable) */
  getCustomerLoyalty: (customerId: string) =>
    api<CustomerLoyaltyDTO>(`/loyalty/customers/${customerId}`, { method: 'GET' }),

  /** Preview points redemption (no persistence) */
  previewRedemption: (customerId: string, points: number) =>
    api<PreviewRedemptionResult>('/loyalty/preview', {
      method: 'POST',
      body: { customerId, points },
    }),

  /** Get redemption history for a customer */
  getRedemptions: (customerId: string) =>
    api(`/loyalty/customers/${customerId}/redemptions`, { method: 'GET' }),
};
