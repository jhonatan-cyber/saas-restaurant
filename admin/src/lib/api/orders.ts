import { type OrderDTO, type OrderItemDTO, type OrderStateLogDTO, type OrderListItemDTO, type OrderStatus, type OrderType, type KdsOrderDTO, type KdsViewDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

export interface OrderFilters {
  status?: string | string[];
  type?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  channel?: 'POS_WEB' | 'POS_DESKTOP' | 'MOBILE' | 'KIOSK' | 'ADMIN';
  tableId?: string;
  customerId?: string;
  cashierId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface KdsFilters {
  branchId: string;
  preparationAreaId?: string;
  states?: string[];
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
  unitPrice?: number;
}

export interface CreateOrderInput {
  type?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  channel?: 'POS_WEB' | 'POS_DESKTOP' | 'MOBILE' | 'KIOSK' | 'ADMIN';
  tableId?: string;
  customerId?: string;
  waiterId?: string;
  globalNotes?: string;
  // FASE 7: Loyalty points redemption
  redeemPoints?: number;
  discount?: number;
  discountReason?: string;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderItemInput {
  quantity?: number;
  notes?: string | null;
}

export interface TransitionOrderInput {
  to: string;
  reason?: string;
  expectedVersion?: number;
}

export interface CancelOrderInput {
  reason: string;
  expectedVersion?: number;
}

export type Order = OrderDTO;
export type OrderItem = OrderItemDTO;
export type OrderStateLog = OrderStateLogDTO;
export type OrderListItem = OrderListItemDTO;
export type KdsOrder = KdsOrderDTO;
export type KdsAreaGroup = KdsViewDTO['areas'][number];
export type KdsView = KdsViewDTO;

export const ordersApi = {
  kds: (filters: KdsFilters) => {
    const params = new URLSearchParams();
    params.set('branchId', filters.branchId);
    if (filters.preparationAreaId) params.set('preparationAreaId', filters.preparationAreaId);
    if (filters.states?.length) params.set('states', filters.states.join(','));
    return api<KdsViewDTO>(`/orders/kds?${params.toString()}`, {
      method: 'GET',
      branchId: filters.branchId,
    });
  },

  list: (filters: OrderFilters = {}, branchId?: string) => {
    const params = new URLSearchParams();
    if (filters.status) {
      const arr = Array.isArray(filters.status) ? filters.status : [filters.status];
      arr.forEach((s) => params.append('status', s));
    }
    if (filters.type) params.set('type', filters.type);
    if (filters.channel) params.set('channel', filters.channel);
    if (filters.tableId) params.set('tableId', filters.tableId);
    if (filters.customerId) params.set('customerId', filters.customerId);
    if (filters.cashierId) params.set('cashierId', filters.cashierId);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<OrderListItemDTO>>(`/orders${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  get: (id: string) => api<OrderDTO>(`/orders/${id}`, { method: 'GET' }),

  getLogs: (id: string) => api<OrderStateLogDTO[]>(`/orders/${id}/logs`, { method: 'GET' }),

  create: (data: CreateOrderInput, branchId?: string) =>
    api<OrderDTO>('/orders', {
      method: 'POST',
      body: data,
      ...(branchId ? { branchId } : {}),
    }),

  addItem: (orderId: string, data: CreateOrderItemInput) =>
    api<OrderDTO>(`/orders/${orderId}/items`, { method: 'POST', body: data }),

  updateItem: (orderId: string, itemId: string, data: UpdateOrderItemInput) =>
    api<OrderDTO>(`/orders/${orderId}/items/${itemId}`, { method: 'PATCH', body: data }),

  removeItem: (orderId: string, itemId: string) =>
    api<OrderDTO>(`/orders/${orderId}/items/${itemId}`, { method: 'DELETE' }),

  transition: (orderId: string, data: TransitionOrderInput) =>
    api<OrderDTO>(`/orders/${orderId}/transition`, { method: 'POST', body: data }),

  cancel: (orderId: string, data: CancelOrderInput) =>
    api<OrderDTO>(`/orders/${orderId}/cancel`, { method: 'POST', body: data }),
};
