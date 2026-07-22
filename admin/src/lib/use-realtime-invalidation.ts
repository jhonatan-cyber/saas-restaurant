import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStore } from './realtime-store';
import { WS_EVENTS } from '@saas/shared';
import type {
  WsOrderCreatedPayload,
  WsOrderUpdatedPayload,
  WsOrderItemAddedPayload,
  WsOrderItemUpdatedPayload,
  WsOrderItemRemovedPayload,
  WsOrderStateChangedPayload,
  WsOrderCancelledPayload,
} from '@saas/shared';

/**
 * Hook que mapea eventos WebSocket → invalidaciones de React Query.
 *
 * - Se monta UNA vez en el layout autenticado (`_authed.tsx`).
 * - Por cada evento del server, invalida las queries relevantes.
 * - Strategy: invalidamos `['orders']` (prefijo) para que cualquier query
 *   que matchee (`['orders', 'list', filters]`, `['orders', 'kds', branchId]`,
 *   `['orders', 'detail', id]`) se refresque.
 * - Es seguro re-invalidar: React Query deduplica refetches activos.
 *
 * Por qué hook y no subscribe en el manager:
 *  - Necesita acceso al QueryClient, que es contexto React.
 *  - Mantiene el manager agnóstico de React Query.
 */
export function useRealtimeInvalidation(): void {
  const queryClient = useQueryClient();
  const socket = useRealtimeStore((s) => s.socket);

  useEffect(() => {
    if (!socket) return;

    const invalidate = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    const onCreated = (_p: WsOrderCreatedPayload): void => invalidate();
    const onUpdated = (_p: WsOrderUpdatedPayload): void => invalidate();
    const onItemAdded = (_p: WsOrderItemAddedPayload): void => invalidate();
    const onItemUpdated = (_p: WsOrderItemUpdatedPayload): void => invalidate();
    const onItemRemoved = (_p: WsOrderItemRemovedPayload): void => invalidate();
    const onStateChanged = (_p: WsOrderStateChangedPayload): void => invalidate();
    const onCancelled = (_p: WsOrderCancelledPayload): void => invalidate();

    socket.on(WS_EVENTS.ORDER_CREATED, onCreated);
    socket.on(WS_EVENTS.ORDER_UPDATED, onUpdated);
    socket.on(WS_EVENTS.ORDER_ITEM_ADDED, onItemAdded);
    socket.on(WS_EVENTS.ORDER_ITEM_UPDATED, onItemUpdated);
    socket.on(WS_EVENTS.ORDER_ITEM_REMOVED, onItemRemoved);
    socket.on(WS_EVENTS.ORDER_STATE_CHANGED, onStateChanged);
    socket.on(WS_EVENTS.ORDER_CANCELLED, onCancelled);

    return () => {
      socket.off(WS_EVENTS.ORDER_CREATED, onCreated);
      socket.off(WS_EVENTS.ORDER_UPDATED, onUpdated);
      socket.off(WS_EVENTS.ORDER_ITEM_ADDED, onItemAdded);
      socket.off(WS_EVENTS.ORDER_ITEM_UPDATED, onItemUpdated);
      socket.off(WS_EVENTS.ORDER_ITEM_REMOVED, onItemRemoved);
      socket.off(WS_EVENTS.ORDER_STATE_CHANGED, onStateChanged);
      socket.off(WS_EVENTS.ORDER_CANCELLED, onCancelled);
    };
  }, [socket, queryClient]);
}
