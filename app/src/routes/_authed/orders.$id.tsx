import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ordersApi, type Order } from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { useAuthStore } from '~/lib/auth-store';
import {
  ConfirmDialog,
  PaymentModal,
  RoutePending,
  OrderHeader,
  OrderInfoCard,
  OrderTotalsCard,
  OrderItemsTable,
  OrderActions,
  OrderTimeline,
} from '~/components';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@saas/shared';
import { allowedTransitions, isTerminal } from '~/lib/order-state-machine';

/**
 * Detalle de una orden.
 * Compuesto por subcomponentes extraídos:
 *   OrderHeader, OrderActions, OrderInfoCard, OrderTotalsCard,
 *   OrderItemsTable, OrderTimeline + ConfirmDialog y PaymentModal.
 * Refresca vía WS (ya invalidado en _authed.tsx).
 */
export const Route = createFileRoute('/_authed/orders/$id')({
  component: OrderDetailPage,
  pendingComponent: RoutePending,
});

function OrderDetailPage(): ReactNode {
  const { id } = Route.useParams();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [transitionTo, setTransitionTo] = useState<OrderStatus | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  });

  const logsQuery = useQuery({
    queryKey: ['orders', 'logs', id],
    queryFn: () => ordersApi.getLogs(id),
    enabled: !!id,
  });

  const knownErrors = {
    staleVersion: 'Otro usuario modificó esta orden. Refrescá la pantalla.',
    transitionNotAllowed: 'Esa transición ya no es válida (la orden cambió de estado).',
  } as const;

  const transitionMutation = useMutation({
    mutationFn: ({ to, reason, expectedVersion }: { to: OrderStatus; reason?: string; expectedVersion: number }) =>
      ordersApi.transition(id, { to, reason, expectedVersion }),
    onSuccess: () => {
      setActionError(null);
      setTransitionTo(null);
      setTransitionReason('');
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: handleMutationError(setActionError, { knownErrors }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ reason, expectedVersion }: { reason: string; expectedVersion: number }) =>
      ordersApi.cancel(id, { reason, expectedVersion }),
    onSuccess: () => {
      setActionError(null);
      setShowCancel(false);
      setCancelReason('');
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: handleMutationError(setActionError, { knownErrors }),
  });

  if (orderQuery.isLoading) {
    return <div className="p-8 text-center text-slate-500">Cargando orden…</div>;
  }
  if (orderQuery.error) {
    return (
      <div className="card p-8 text-center text-red-600">
        Error al cargar la orden
      </div>
    );
  }
  if (!orderQuery.data) return null;

  const order: Order = orderQuery.data;
  const logs = logsQuery.data ?? [];
  const terminal = isTerminal(order.status);
  const canCancel = !terminal && order.status !== 'DELIVERED';
  const canPay = order.status === 'DELIVERED';
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const next = allowedTransitions(order.status).filter((s) => s !== 'CANCELLED');

  return (
    <div className="space-y-6">
      <OrderHeader order={order} />

      <OrderActions
        order={order}
        next={next}
        canPay={canPay}
        canCancel={canCancel}
        isAdmin={isAdmin}
        actionError={actionError}
        onTransition={setTransitionTo}
        onPay={() => setShowPayment(true)}
        onCancel={() => setShowCancel(true)}
      />

      <OrderInfoCard order={order} />
      <OrderTotalsCard order={order} />
      <OrderItemsTable items={order.items} />
      <OrderTimeline logs={logs} />

      <ConfirmDialog
        open={transitionTo !== null}
        title={`Cambiar estado a: ${transitionTo ? ORDER_STATUS_LABELS[transitionTo] : ''}`}
        message={
          <div className="space-y-2">
            <p>Razón (opcional):</p>
            <input
              type="text"
              className="input"
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              maxLength={500}
              placeholder="ej. cliente cambió de opinión"
            />
          </div>
        }
        confirmText="Confirmar"
        variant="primary"
        isLoading={transitionMutation.isPending}
        onCancel={() => { setTransitionTo(null); setTransitionReason(''); }}
        onConfirm={() => {
          if (!transitionTo) return;
          transitionMutation.mutate({
            to: transitionTo,
            reason: transitionReason.trim() || undefined,
            expectedVersion: order.version,
          });
        }}
      />

      <ConfirmDialog
        open={showCancel}
        title="Cancelar orden"
        message={
          <div className="space-y-2">
            <p>
              ¿Cancelar la orden <strong>#{order.id.slice(-8).toUpperCase()}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <p className="text-xs text-slate-500">Razón (obligatoria, ≥5 chars):</p>
            <textarea
              className="input resize-none"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={500}
              placeholder="ej. cliente se fue sin pagar"
            />
            {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          </div>
        }
        confirmText="Cancelar orden"
        isLoading={cancelMutation.isPending}
        onCancel={() => { setShowCancel(false); setCancelReason(''); }}
        onConfirm={() => {
          if (cancelReason.trim().length < 5) return;
          cancelMutation.mutate({
            reason: cancelReason.trim(),
            expectedVersion: order.version,
          });
        }}
      />

      <PaymentModal
        open={showPayment}
        order={order}
        branchId={order.branchId}
        onClose={() => setShowPayment(false)}
        onPaid={() => {
          setShowPayment(false);
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
        }}
      />
    </div>
  );
}
