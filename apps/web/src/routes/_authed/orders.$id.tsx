import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ordersApi,
  ApiClientError,
  type Order,
  type OrderStateLog,
} from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { OrderStateBadge } from '~/components/order-state-badge';
import { ConfirmDialog } from '~/components/confirm-dialog';
import { SubmitButton } from '~/components/submit-button';
import { PaymentModal } from '~/components/payment-modal';
import {
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  ORDER_CHANNEL_LABELS,
  type OrderStatus,
} from '@saas/shared';
import {
  allowedTransitions,
  isTerminal,
} from '~/lib/order-state-machine';

/**
 * Detalle de una orden.
 * - Header: id, type, status, mesa, customer, cashier, totales, versión.
 * - Items: snapshot inmutable.
 * - State history: timeline vertical con cada cambio.
 * - Acciones: avanzar estado (transitions válidas), cancelar (OWNER/ADMIN).
 * - Refresca vía WS (ya invalidado en _authed.tsx).
 */
export const Route = createFileRoute('/_authed/orders/$id')({
  component: OrderDetailPage,
});

const CAN_ROLES = ['OWNER', 'ADMIN'] as const;

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

  const transitionMutation = useMutation({
    mutationFn: ({ to, reason, expectedVersion }: { to: OrderStatus; reason?: string; expectedVersion: number }) =>
      ordersApi.transition(id, { to, reason, expectedVersion }),
    onSuccess: () => {
      setActionError(null);
      setTransitionTo(null);
      setTransitionReason('');
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: handleMutationError,
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
    onError: handleMutationError,
  });

  function handleMutationError(err: unknown): void {
    if (err instanceof ApiClientError) {
      const code = (err.body as { code?: string })?.code;
      if (code === 'staleVersion') {
        setActionError('Otro usuario modificó esta orden. Refrescá la pantalla.');
        return;
      }
      if (code === 'transitionNotAllowed') {
        setActionError('Esa transición ya no es válida (la orden cambió de estado).');
        return;
      }
      setActionError(err.message);
      return;
    }
    setActionError('Error desconocido');
  }

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
  const logs: OrderStateLog[] = logsQuery.data ?? [];
  const terminal = isTerminal(order.status);
  const canCancel = !terminal && order.status !== 'DELIVERED';
  const canPay = order.status === 'DELIVERED';
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const next = allowedTransitions(order.status).filter((s) => s !== 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            to="/orders"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Volver a órdenes
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Orden #{order.id.slice(-8).toUpperCase()}
          </h1>
        </div>
        <OrderStateBadge status={order.status} />
      </div>

      {/* Cancel info */}
      {order.status === 'CANCELLED' && order.cancellationReason && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Orden cancelada</p>
          <p className="mt-1">
            Razón: {order.cancellationReason}
            {order.cancelledByUserId && (
              <span className="ml-2 text-xs text-red-700">
                (por {order.cancelledByUserId.slice(-8)})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Acciones */}
      {!terminal && (
        <div className="card flex flex-wrap items-center gap-2 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Acciones
          </span>
          {next.map((to) => (
            <button
              key={to}
              type="button"
              className="btn-secondary"
              onClick={() => setTransitionTo(to)}
            >
              → {ORDER_STATUS_LABELS[to]}
            </button>
          ))}
          {canPay && (
            <button
              type="button"
              className="btn-primary ml-auto"
              onClick={() => setShowPayment(true)}
            >
              Cobrar (Bs {Number(order.total).toFixed(2)})
            </button>
          )}
          {canCancel && isAdmin && !canPay && (
            <button
              type="button"
              className="btn-danger ml-auto"
              onClick={() => setShowCancel(true)}
            >
              Cancelar orden
            </button>
          )}
          {actionError && (
            <p className="basis-full text-sm text-red-600">{actionError}</p>
          )}
        </div>
      )}

      {/* Info general */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <Field label="Tipo" value={ORDER_TYPE_LABELS[order.type]} />
          <Field
            label="Canal"
            value={ORDER_CHANNEL_LABELS[order.channel] ?? order.channel}
          />
          <Field
            label="Mesa"
            value={order.tableId ? order.tableId.slice(-6) : 'Sin mesa'}
          />
          <Field
            label="Customer"
            value={order.customerId ? order.customerId.slice(-8) : 'Consumidor final'}
          />
          <Field label="Cajero" value={order.cashierId.slice(-8)} />
          {order.waiterId && (
            <Field label="Mesero" value={order.waiterId.slice(-8)} />
          )}
          <Field
            label="Creada"
            value={new Date(order.createdAt).toLocaleString('es-BO')}
          />
          <Field
            label="Actualizada"
            value={new Date(order.updatedAt).toLocaleString('es-BO')}
          />
        </div>
      </div>

      {/* Totales */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Totales</h2>
        <div className="mt-3 space-y-1 text-sm">
          <Row label="Subtotal" value={`Bs ${Number(order.subtotal).toFixed(2)}`} />
          <Row label="Impuestos" value={`Bs ${Number(order.taxTotal).toFixed(2)}`} />
          <Row
            label="Total"
            value={`Bs ${Number(order.total).toFixed(2)}`}
            bold
          />
          <p className="pt-1 text-xs text-slate-500">Versión: {order.version}</p>
        </div>
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Ítems ({order.items.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3 text-right">Cant.</th>
              <th className="px-4 py-3 text-right">P. unit.</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {order.items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{it.productName}</p>
                  {it.preparationAreaName && (
                    <p className="text-xs text-slate-500">
                      → {it.preparationAreaName}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{it.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  Bs {Number(it.unitPrice).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  Bs {Number(it.lineTotal).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-xs italic text-slate-600">
                  {it.notes ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Historial de estados</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Sin cambios registrados.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="border-l-4 border-slate-300 pl-3 text-sm"
              >
                <p className="font-medium text-slate-900">
                  {log.fromStatus
                    ? `${ORDER_STATUS_LABELS[log.fromStatus as OrderStatus] ?? log.fromStatus} → `
                    : ''}
                  {ORDER_STATUS_LABELS[log.toStatus as OrderStatus] ?? log.toStatus}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString('es-BO')} · por{' '}
                  {log.changedByUserId.slice(-8)}
                </p>
                {log.reason && (
                  <p className="mt-1 text-xs italic text-slate-600">{log.reason}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Diálogos */}
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
        isLoading={transitionMutation.isPending}
        onCancel={() => {
          setTransitionTo(null);
          setTransitionReason('');
        }}
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
            {actionError && (
              <p className="text-xs text-red-600">{actionError}</p>
            )}
          </div>
        }
        confirmText="Cancelar orden"
        isLoading={cancelMutation.isPending}
        onCancel={() => {
          setShowCancel(false);
          setCancelReason('');
        }}
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

function Field({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-900">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}): ReactNode {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? 'border-t border-slate-200 pt-2 text-base font-bold text-slate-900' : 'text-slate-600'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
