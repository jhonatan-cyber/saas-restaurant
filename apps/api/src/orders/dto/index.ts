/**
 * Barrel de DTOs del módulo orders.
 * Permite: `import { CreateOrderDto } from './dto'`.
 */
export type { CreateOrderDto, CreateOrderItemDto } from './create-order.dto';
export type { AddOrderItemDto, UpdateOrderItemDto } from './order-item.dto';
export type { CancelOrderDto, TransitionOrderDto } from './transition-order.dto';
export type { KdsFiltersDto, OrderFiltersDto } from './order-filters.dto';
