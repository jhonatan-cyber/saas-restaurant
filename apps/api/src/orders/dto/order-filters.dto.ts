import type { OrderChannel, OrderStatus, OrderType } from '@saas/shared';

export interface OrderFiltersDto {
  status?: OrderStatus[];
  type?: OrderType;
  channel?: OrderChannel;
  tableId?: string;
  customerId?: string;
  cashierId?: string;
  branchId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface KdsFiltersDto {
  branchId?: string;
  preparationAreaId?: string;
  states?: OrderStatus[];
}
