import { type BusinessDTO, type SubscriptionDTO } from '@saas/shared';
import { api } from './index';

export interface UpdateBusinessData {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  currency?: string;
  timezone?: string;
  moduleReports?: boolean;
  moduleInventory?: boolean;
  modulePosStations?: boolean;
  moduleDeliveryApp?: boolean;
}

export const businessApi = {
  getSettings: () => api<BusinessDTO>('/business/settings', { method: 'GET' }),

  updateSettings: (data: UpdateBusinessData) =>
    api<BusinessDTO>('/business/settings', { method: 'PATCH', body: data }),
};

export const subscriptionApi = {
  getCurrent: () => api<SubscriptionDTO | null>('/subscription/current', { method: 'GET' }),

  assign: (planId: string) =>
    api<SubscriptionDTO>('/subscription/assign', { method: 'POST', body: { planId } }),

  cancel: () => api<SubscriptionDTO>('/subscription/cancel', { method: 'POST' }),
};
