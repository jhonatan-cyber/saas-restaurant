import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  paymentsApi,
  type Order,
} from '../lib/api';
import { handleMutationError } from '../lib/error-handler';
import type {
  PaymentMethod,
  PaymentItemInput,
} from '@saas/shared';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_VALUES,
} from '@saas/shared';
import { SubmitButton } from './submit-button';

interface PaymentModalProps {
  open: boolean;
  order: Order | null;
  branchId: string;
  onClose: () => void;
  onPaid: () => void;
}

interface PaymentItemDraft {
  key: string;
  method: PaymentMethod;
  amount: string;
  tendered: string;
  reference: string;
}

const newDraft = (method: PaymentMethod = 'CASH'): PaymentItemDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  method,
  amount: '',
  tendered: '',
  reference: '',
});

/**
 * Modal de cobro (FASE 4).
 *  - Soporta pago mixto (múltiples PaymentItems).
 *  - CASH: si el cliente entrega más, calcula el vuelto en vivo.
 *  - QR/TRANSFER: requiere `reference` (comprobante).
 *  - CARD: no requiere tendered ni reference.
 *  - La suma de los amounts DEBE coincidir exactamente con el total.
 */
export function PaymentModal({
  open,
  order,
  branchId,
  onClose,
  onPaid,
}: PaymentModalProps): ReactNode {
  const [items, setItems] = useState<PaymentItemDraft[]>([newDraft('CASH')]);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => (order ? Number(order.total) : 0),
    [order],
  );

  const sumAmounts = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0),
    [items],
  );

  const remaining = useMemo(
    () => Math.max(0, total - sumAmounts),
    [total, sumAmounts],
  );

  const overpaid = sumAmounts > total;
  const canPay = !!order && items.length > 0 && sumAmounts === total && !overpaid;

  const payMutation = useMutation({
    mutationFn: (data: { payments: PaymentItemInput[] }) =>
      paymentsApi.payOrder(order!.id, data, branchId),
    onSuccess: () => {
      setError(null);
      setItems([newDraft('CASH')]);
      onPaid();
    },
    onError: handleMutationError(setError, { fallback: 'Error al procesar el pago' }),
  });

  if (!open || !order) return null;

  const updateItem = (key: string, patch: Partial<PaymentItemDraft>): void => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const addItem = (): void => {
    const last = items[items.length - 1];
    setItems((prev) => [...prev, newDraft(last?.method ?? 'CASH')]);
  };

  const removeItem = (key: string): void => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));
  };

  const fillRemaining = (key: string): void => {
    updateItem(key, { amount: remaining.toFixed(2) });
  };

  const onConfirm = (): void => {
    if (!canPay) return;
    const payments: PaymentItemInput[] = items.map((it) => {
      const amount = Number(it.amount);
      const draft: PaymentItemInput = { method: it.method, amount };
      if (it.method === 'CASH' && it.tendered) {
        const tendered = Number(it.tendered);
        const change = Math.max(0, tendered - amount);
        return { ...draft, tendered, change };
      }
      if (it.method === 'QR' || it.method === 'TRANSFER') {
        if (it.reference) return { ...draft, reference: it.reference };
      }
      return draft;
    });
    payMutation.mutate({ payments });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8"
      onClick={payMutation.isPending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card flex max-h-full w-full max-w-2xl flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Registrar pago</h2>
            <p className="text-sm text-slate-500">
              Orden #{order.id.slice(-8).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total a cobrar</p>
            <p className="text-2xl font-bold text-brand-600">
              Bs {total.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto py-3">
          {items.map((it, idx) => {
            const amount = Number(it.amount) || 0;
            const tendered = Number(it.tendered) || 0;
            const change =
              it.method === 'CASH' && tendered > amount ? tendered - amount : 0;
            const needsReference = it.method === 'QR' || it.method === 'TRANSFER';
            const refMissing = needsReference && !it.reference.trim();
            const amountMissing = amount <= 0;
            return (
              <div
                key={it.key}
                className="rounded-md border border-slate-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pago #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                      onClick={() => removeItem(it.key)}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Método</label>
                    <select
                      className="input"
                      value={it.method}
                      onChange={(e) =>
                        updateItem(it.key, { method: e.target.value as PaymentMethod })
                      }
                    >
                      {PAYMENT_METHOD_VALUES.map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Monto (Bs)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        value={it.amount}
                        onChange={(e) => updateItem(it.key, { amount: e.target.value })}
                        placeholder="0.00"
                      />
                      <button
                        type="button"
                        className="btn-secondary px-2 text-xs"
                        onClick={() => fillRemaining(it.key)}
                        title="Llenar con el saldo pendiente"
                      >
                        ⟵
                      </button>
                    </div>
                  </div>
                </div>
                {it.method === 'CASH' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Entrega (Bs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        value={it.tendered}
                        onChange={(e) => updateItem(it.key, { tendered: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Vuelto</label>
                      <input
                        type="text"
                        className="input bg-slate-50"
                        value={change > 0 ? `Bs ${change.toFixed(2)}` : '—'}
                        readOnly
                      />
                    </div>
                  </div>
                )}
                {needsReference && (
                  <div className="mt-2">
                    <label className="mb-1 block text-xs text-slate-500">
                      Nro. de comprobante / referencia
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={it.reference}
                      onChange={(e) => updateItem(it.key, { reference: e.target.value })}
                      placeholder="ej. TRX-12345"
                      maxLength={100}
                    />
                    {refMissing && (
                      <p className="mt-1 text-xs text-amber-600">
                        QR/Transferencia requiere referencia.
                      </p>
                    )}
                  </div>
                )}
                {amountMissing && it.amount !== '' && (
                  <p className="mt-1 text-xs text-red-600">El monto debe ser &gt; 0.</p>
                )}
              </div>
            );
          })}

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={addItem}
            disabled={sumAmounts >= total}
          >
            + Agregar método de pago (mixto)
          </button>
        </div>

        <div className="space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Total a cobrar</span>
            <span className="tabular-nums">Bs {total.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Asignado</span>
            <span className="tabular-nums">Bs {sumAmounts.toFixed(2)}</span>
          </div>
          <div
            className={`flex items-center justify-between text-base font-bold ${
              sumAmounts === total ? 'text-green-700' : 'text-amber-700'
            }`}
          >
            <span>{sumAmounts === total ? 'Cuadrado' : overpaid ? 'Excedido' : 'Faltante'}</span>
            <span className="tabular-nums">
              Bs {Math.abs(remaining).toFixed(2)}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={payMutation.isPending}
          >
            Cancelar
          </button>
          <SubmitButton
            type="button"
            onClick={onConfirm}
            isSubmitting={payMutation.isPending}
            loadingText="Procesando…"
            disabled={!canPay}
          >
            Confirmar pago
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
