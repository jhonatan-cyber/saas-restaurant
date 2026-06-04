import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ordersApi,
  tablesApi,
  ApiClientError,
  type Order,
} from '../lib/api';
import {
  useOrdersCartStore,
  computeSubtotal,
  computeTax,
  computeTotal,
  formatMoney,
  cartItemCount,
} from '../lib/orders-store';
import { SubmitButton } from './submit-button';
import { ERROR_CODES, ORDER_TYPE_LABELS, type OrderType } from '@saas/shared';

interface OrderCartPanelProps {
  branchId: string;
}

const ORDER_TYPES: OrderType[] = ['DINE_IN', 'TAKEOUT', 'DELIVERY'];

/**
 * Panel derecho del POS.
 * - Lee el cart desde useOrdersCartStore (Zustand).
 * - Type select (DINE_IN/TAKEOUT/DELIVERY) + table select + globalNotes.
 * - Lista de items con qty controls y notas editables.
 * - Totales.
 * - "Cancelar" (clear) y "Crear y enviar a cocina" (create + transition a SENT_TO_KITCHEN).
 *
 * Manejo de errores:
 *   - cashSessionRequired → mensaje claro (F4 permitirá abrir caja).
 *   - staleVersion        → pedir refresh (no aplica en create, pero sí en transition).
 *   - default             → ApiClientError.message.
 */
export function OrderCartPanel({ branchId }: OrderCartPanelProps): ReactNode {
  const queryClient = useQueryClient();

  const items = useOrdersCartStore((s) => s.items);
  const tableId = useOrdersCartStore((s) => s.tableId);
  const tableNumber = useOrdersCartStore((s) => s.tableNumber);
  const type = useOrdersCartStore((s) => s.type);
  const globalNotes = useOrdersCartStore((s) => s.globalNotes);
  const setTable = useOrdersCartStore((s) => s.setTable);
  const setType = useOrdersCartStore((s) => s.setType);
  const setGlobalNotes = useOrdersCartStore((s) => s.setGlobalNotes);
  const updateQty = useOrdersCartStore((s) => s.updateQty);
  const updateNotes = useOrdersCartStore((s) => s.updateNotes);
  const removeItem = useOrdersCartStore((s) => s.removeItem);
  const clear = useOrdersCartStore((s) => s.clear);

  const [success, setSuccess] = useState<{ orderId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mesas libres de la sucursal (para el select)
  const tablesQuery = useQuery({
    queryKey: ['tables', 'all', { branchId }],
    queryFn: () => tablesApi.all(branchId),
    enabled: !!branchId,
  });

  const sendMutation = useMutation({
    mutationFn: async (): Promise<Order> => {
      const created = await ordersApi.create(
        {
          type,
          channel: 'POS_WEB',
          tableId: tableId ?? undefined,
          globalNotes: globalNotes.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes ?? undefined,
            // unitPrice omitido a propósito: el backend lo IGNORA (recalcula).
          })),
        },
        branchId,
      );
      // Después de crear, transicionar a SENT_TO_KITCHEN (PENDING → SENT).
      // expectedVersion: la versión que devolvió el create (que es 1 tras el increment).
      return ordersApi.transition(created.id, {
        to: 'SENT_TO_KITCHEN',
        expectedVersion: created.version,
      });
    },
    onSuccess: (order) => {
      setErrorMsg(null);
      setSuccess({ orderId: order.id });
      clear();
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Auto-dismiss a los 5s
      setTimeout(() => setSuccess(null), 5000);
    },
    onError: (err: unknown) => {
      setSuccess(null);
      if (err instanceof ApiClientError) {
        const code = (err.body as { code?: string })?.code;
        if (code === ERROR_CODES.CASH_SESSION_REQUIRED) {
          setErrorMsg(
            'Debe abrir caja y turno en esta sucursal antes de tomar órdenes.',
          );
          return;
        }
        if (code === ERROR_CODES.STALE_VERSION) {
          setErrorMsg(
            'Otro usuario modificó esta orden. Refrescá la pantalla e intentá de nuevo.',
          );
          return;
        }
        setErrorMsg(err.message);
        return;
      }
      setErrorMsg('Error desconocido al crear la orden');
    },
  });

  const tables = tablesQuery.data ?? [];
  const subtotal = computeSubtotal(items);
  const tax = computeTax(items);
  const total = computeTotal(items);
  const count = cartItemCount(items);
  const canSend = items.length > 0 && !sendMutation.isPending;

  return (
    <div className="card sticky top-4 flex max-h-[calc(100vh-6rem)] flex-col p-4">
      {/* Header: type + mesa */}
      <div className="space-y-3 border-b border-slate-200 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tipo
            </label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as OrderType)}
            >
              {ORDER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ORDER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mesa
            </label>
            <select
              className="input"
              value={tableId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                const tbl = tables.find((t) => t.id === id);
                setTable(id, tbl ? tbl.number : null);
              }}
            >
              <option value="">Sin mesa</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Mesa {t.number} (cap. {t.capacity})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de items */}
      <div className="flex-1 overflow-y-auto py-3">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            El cart está vacío. Tocá un producto del lado izquierdo para agregarlo.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li
                key={i.productId}
                className="rounded-md border border-slate-200 p-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {i.productName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Bs {Number(i.unitPrice).toFixed(2)} c/u
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i.productId)}
                    className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
                    aria-label="Quitar"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQty(i.productId, i.quantity - 1)}
                      className="h-7 w-7 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">
                      {i.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(i.productId, i.quantity + 1)}
                      className="h-7 w-7 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    Bs {(Number(i.unitPrice) * i.quantity).toFixed(2)}
                  </span>
                </div>
                <input
                  type="text"
                  value={i.notes ?? ''}
                  onChange={(e) =>
                    updateNotes(i.productId, e.target.value || null)
                  }
                  placeholder="Notas (ej. sin cebolla)"
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notas globales */}
      <div className="border-t border-slate-200 pt-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Notas de la orden
        </label>
        <textarea
          value={globalNotes}
          onChange={(e) => setGlobalNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Ej. cliente alérgico al maní"
          className="input resize-none text-sm"
        />
      </div>

      {/* Totales */}
      <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
        <div className="flex items-center justify-between text-slate-600">
          <span>Ítems</span>
          <span className="tabular-nums">{count}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="tabular-nums">Bs {formatMoney(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Impuestos</span>
          <span className="tabular-nums">Bs {formatMoney(tax)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
          <span>Total</span>
          <span className="tabular-nums">Bs {formatMoney(total)}</span>
        </div>
      </div>

      {/* Mensajes */}
      {errorMsg && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {errorMsg}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-2 text-xs text-green-700">
          Orden <Link
            to="/orders/$id"
            params={{ id: success.orderId }}
            className="font-semibold underline"
          >
            #{success.orderId.slice(-6).toUpperCase()}
          </Link>{' '}
          enviada a cocina.
        </div>
      )}

      {/* Acciones */}
      <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
        <SubmitButton
          type="button"
          variant="secondary"
          isSubmitting={false}
          onClick={() => {
            clear();
            setErrorMsg(null);
            setSuccess(null);
          }}
          disabled={items.length === 0}
        >
          Cancelar
        </SubmitButton>
        <SubmitButton
          type="button"
          isSubmitting={sendMutation.isPending}
          loadingText="Enviando…"
          fullWidth
          onClick={() => sendMutation.mutate()}
          disabled={!canSend}
        >
          Crear y enviar a cocina
        </SubmitButton>
      </div>

      {tableNumber && (
        <p className="mt-2 text-center text-xs text-slate-500">
          Mesa {tableNumber} · {ORDER_TYPE_LABELS[type]}
        </p>
      )}
    </div>
  );
}
