/**
 * Hooks de TanStack Query para la app mobile.
 *
 * Centraliza el fetching de datos y mutaciones usando
 * el cliente HTTP con auto-refresh (api-client.ts).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './api-client';
import type {
  TableDTO,
  ProductListItemDTO,
  OrderListItemDTO,
  OrderDTO,
  OrderStatus,
  PaginatedResponseDTO,
} from '@saas/shared';

// ── Query keys (centralizados para facilitar invalidaciones) ────────

export const queryKeys = {
  tables: (branchId: string) => ['tables', branchId] as const,
  products: (branchId: string) => ['products', branchId] as const,
  orders: (branchId: string) => ['orders', branchId] as const,
  order: (orderId: string) => ['order', orderId] as const,
};

// ── Queries ─────────────────────────────────────────────────────────

/**
 * Hook: obtener mesas disponibles de la sucursal.
 * Se desactiva si branchId es null/undefined.
 * Stale time de 30s para no re-fetch innecesario.
 */
export function useTables(branchId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tables(branchId ?? ''),
    queryFn: () =>
      apiRequest<PaginatedResponseDTO<TableDTO>>(`/tables/all?branchId=${branchId}`, {
        branchId: branchId!,
      }),
    enabled: !!branchId,
    staleTime: 30_000,
    select: (data) =>
      data.data.map((t) => ({
        id: t.id,
        number: t.number,
        status: t.status,
        capacity: t.capacity,
      })),
  });
}

/**
 * Hook: obtener productos disponibles para la venta.
 * Solo productos activos y disponibles (isAvailable=true).
 */
export function useProducts(branchId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products(branchId ?? ''),
    queryFn: () =>
      apiRequest<PaginatedResponseDTO<ProductListItemDTO>>('/products/all?isAvailable=true&pageSize=500', {
        branchId: branchId!,
      }),
    enabled: !!branchId,
    staleTime: 30_000,
    select: (res) => res.data,
  });
}

/**
 * Hook: obtener una orden individual por su ID.
 * Devuelve el OrderDTO completo con `version` para optimistic lock.
 * Se desactiva si orderId es null/undefined.
 */
export function useCurrentOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.order(orderId ?? ''),
    queryFn: () =>
      apiRequest<OrderDTO>(`/orders/${orderId}`, {
        // No necesita branchId porque la orden lleva el businessId en la URL
      }),
    enabled: !!orderId,
    staleTime: 0, // Siempre obtener datos frescos
    retry: 1,
  });
}

/**
 * Hook: obtener órdenes de delivery activas.
 * Hace polling cada 15s para refrescar automáticamente.
 */
export function useDeliveryOrders(branchId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.orders(branchId ?? ''),
    queryFn: () =>
      apiRequest<PaginatedResponseDTO<OrderListItemDTO>>(
        `/orders?type=DELIVERY&pageSize=20&branchId=${branchId}`,
        { branchId: branchId! },
      ),
    enabled: !!branchId,
    refetchInterval: 15_000,
    select: (data) => data.data,
  });
}

// ── Mutations ───────────────────────────────────────────────────────

/**
 * Mutation: crear una nueva orden DINE_IN desde la app mobile.
 * Al completar, invalida las queries de órdenes para refrescar.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      branchId: string;
      tableId: string;
      items: Array<{ productId: string; quantity: number }>;
    }) =>
      apiRequest<OrderDTO>('/orders', {
        method: 'POST',
        branchId: params.branchId,
        body: {
          type: 'DINE_IN',
          channel: 'MOBILE',
          tableId: params.tableId,
          items: params.items,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/**
 * Mutation: transicionar el estado de una orden (ej: SENT_TO_KITCHEN, DELIVERED).
 */
export function useTransitionOrder() {
  return useMutation({
    mutationFn: (params: {
      branchId: string;
      orderId: string;
      to: OrderStatus;
      /** Versión esperada para optimistic lock. Si no se envía, el server la omite. */
      expectedVersion?: number;
    }) =>
      apiRequest<OrderDTO>(`/orders/${params.orderId}/transition`, {
        method: 'POST',
        branchId: params.branchId,
        body: {
          to: params.to,
          ...(params.expectedVersion !== undefined
            ? { expectedVersion: params.expectedVersion }
            : {}),
        },
      }),
  });
}
