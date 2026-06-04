import { useState } from 'react';
import type { ReactNode } from 'react';
import { ORDER_STATUS_LABELS, type OrderStatus, type KdsOrderDTO } from '@saas/shared';
import { SubmitButton } from './submit-button';

interface KdsOrderCardProps {
  order: KdsOrderDTO;
  /** Avanza el estado (no cancelar). Va al endpoint /transition. */
  onTransition: (to: OrderStatus) => void;
  /** Cancela la orden. Va al endpoint /cancel (razón obligatoria). */
  onCancel: (reason: string) => void;
  /** true si hay un transition en curso para esta orden. */
  isTransitionPending?: boolean;
  /** true si hay un cancel en curso para esta orden. */
  isCancelPending?: boolean;
}

/**
 * Card de orden para la pantalla de cocina.
 * - Muestra: número de orden, mesa/tipo, tiempo transcurrido (color por SLA), ítems, notas.
 * - Botones de acción según estado: SENT_TO_KITCHEN → "En preparación", etc.
 * - Botón "Cancelar" con prompt de razón (en F4 esto se reemplazará por un modal).
 *
 * Color del tiempo:
 *   <  5 min → verde
 *   5-15 min → amarillo
 *   > 15 min → rojo
 */
export function KdsOrderCard({
  order,
  onTransition,
  onCancel,
  isTransitionPending,
  isCancelPending,
}: KdsOrderCardProps): ReactNode {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const isPending = Boolean(isTransitionPending || isCancelPending);

  const minutes = Math.floor(order.elapsedSeconds / 60);
  const seconds = order.elapsedSeconds % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const timeColor =
    minutes < 5
      ? 'bg-green-100 text-green-700'
      : minutes < 15
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-700';

  const headerLabel = order.tableNumber
    ? `Mesa ${order.tableNumber}`
    : order.type === 'TAKEOUT'
      ? 'Para llevar'
      : order.type === 'DELIVERY'
        ? 'Delivery'
        : 'Sin mesa';

  const nextActions: { to: OrderStatus; label: string; variant: 'primary' | 'secondary' }[] = [];
  if (order.status === 'SENT_TO_KITCHEN') {
    nextActions.push({ to: 'IN_PREPARATION', label: 'En preparación', variant: 'primary' });
  } else if (order.status === 'IN_PREPARATION') {
    nextActions.push({ to: 'READY', label: 'Listo', variant: 'primary' });
  } else if (order.status === 'READY') {
    nextActions.push({ to: 'DELIVERED', label: 'Entregado', variant: 'primary' });
  }
  const canCancel =
    order.status === 'SENT_TO_KITCHEN' ||
    order.status === 'IN_PREPARATION' ||
    order.status === 'READY';

  const orderShort = order.id.slice(-6).toUpperCase();

  return (
    <div className="card flex flex-col gap-2 p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            #{orderShort} · {headerLabel}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${timeColor}`}
          title={`Hace ${minutes}m ${seconds}s`}
        >
          {timeStr}
        </span>
      </div>

      {/* Items */}
      <ul className="space-y-1 text-sm">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-start gap-2">
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
              {it.quantity}×
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-slate-900">{it.productName}</p>
              {it.notes && (
                <p className="text-xs italic text-amber-700">! {it.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Notas globales */}
      {order.globalNotes && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {order.globalNotes}
        </div>
      )}

      {/* Acciones */}
      <div className="mt-1 flex flex-col gap-1">
        {nextActions.map((a) => (
          <SubmitButton
            key={a.to}
            type="button"
            isSubmitting={isTransitionPending ?? false}
            loadingText="…"
            fullWidth
            onClick={() => onTransition(a.to)}
          >
            {a.label}
          </SubmitButton>
        ))}

        {canCancel && !showCancelPrompt && (
          <button
            type="button"
            onClick={() => setShowCancelPrompt(true)}
            className="text-xs font-medium text-red-600 hover:text-red-700"
            disabled={isPending}
          >
            Cancelar orden
          </button>
        )}

        {showCancelPrompt && (
          <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-2">
            <label className="block text-[10px] font-semibold uppercase text-red-700">
              Razón (≥5 chars)
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input text-xs"
              placeholder="ej. cliente se fue"
              maxLength={500}
              autoFocus
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setShowCancelPrompt(false);
                  setCancelReason('');
                }}
                className="btn-secondary flex-1 text-xs"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cancelReason.trim().length < 5) return;
                  onCancel(cancelReason.trim());
                  setShowCancelPrompt(false);
                  setCancelReason('');
                }}
                disabled={cancelReason.trim().length < 5 || isCancelPending}
                className="btn-danger flex-1 text-xs"
              >
                {isCancelPending ? 'Cancelando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
