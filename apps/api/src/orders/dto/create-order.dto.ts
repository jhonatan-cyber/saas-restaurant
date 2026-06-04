import { type OrderChannel, type OrderType } from '@saas/shared';

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
  notes?: string;
  unitPrice?: number;
}

export interface CreateOrderDto {
  type?: OrderType;
  channel?: OrderChannel;
  tableId?: string;
  customerId?: string;
  waiterId?: string;
  globalNotes?: string;
  items: CreateOrderItemDto[];
}
