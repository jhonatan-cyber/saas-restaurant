import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { cashMovementsApi } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { SubmitButton } from '~/components/submit-button';
import {
  CASH_MOVEMENT_TYPE_LABELS,
  CASH_MOVEMENT_TYPE_VALUES,
  CASH_MOVEMENT_CATEGORY_LABELS,
  CASH_MOVEMENT_CATEGORY_VALUES,
  type CashMovementType,
  type CashMovementCategory,
} from '@saas/shared';

export const Route = createFileRoute('/_authed/cash-movements')({
  component: CashMovementsPage,
});

/**
 * Pantalla de movimientos de caja (FASE 4).
 *  - Form para crear un movimiento (ingreso/egreso).
 *  - Lista de movimientos del día con paginación.
 *  - Resumen (totalIn / totalOut / net / count).
 *
 * Las categorías que NO requieren turno abierto (OWNER_INVESTMENT,
 * LOAN_RECEIVED) están permitidas incluso cuando no hay turno, según D7-F4.
 */
function CashMovementsPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.defaultBranchId ?? user?.branches?.[0]?.id ?? null;
  const queryClient = useQueryClient();

  const [type, setType] = useState<CashMovementType>('CASH_IN');
  const [category, setCategory] = useState<CashMovementCategory>('OTHER_IN');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['cash-movements', 'list', { branchId }],
    queryFn: () =>
      cashMovementsApi.list({
        branchId: branchId!,
        dateFrom: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        dateTo: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
        pageSize: 50,
      }),
    enabled: !!branchId,
  });

  const summaryQuery = useQuery({
    queryKey: ['cash-movements', 'summary', { branchId }],
    queryFn: () => cashMovementsApi.getSummary({ branchId: branchId! }),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      cashMovementsApi.create({
        branchId: branchId!,
        type,
        category,
        amount: Number(amount),
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      setError(null);
      setAmount('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) setError(err.message);
      else setError('Error al crear el movimiento');
    },
  });

  if (!branchId) {
    return (
      <div className="card p-8 text-center text-slate-500">
        No tenés una sucursal asignada.
      </div>
    );
  }

  const items = listQuery.data?.data ?? [];
  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Movimientos de caja</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ingresos y egresos que no son ventas (aportes, retiros, gastos, etc.).
        </p>
      </div>

      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            label="Ingresos"
            value={`Bs ${Number(summary.totalIn).toFixed(2)}`}
            tone="in"
          />
          <SummaryCard
            label="Egresos"
            value={`Bs ${Number(summary.totalOut).toFixed(2)}`}
            tone="out"
          />
          <SummaryCard
            label="Neto"
            value={`Bs ${Number(summary.net).toFixed(2)}`}
            tone={Number(summary.net) >= 0 ? 'in' : 'out'}
          />
          <SummaryCard label="Cantidad" value={String(summary.count)} tone="neutral" />
        </div>
      )}

      {/* Form */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Nuevo movimiento</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Tipo</label>
            <select
              className="input"
              value={type}
              onChange={(e) => {
                const next = e.target.value as CashMovementType;
                setType(next);
                // Reseteo categoría a un default razonable del tipo elegido
                setCategory(next === 'CASH_IN' ? 'OTHER_IN' : 'SUPPLIES');
              }}
            >
              {CASH_MOVEMENT_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>
                  {CASH_MOVEMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Categoría</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as CashMovementCategory)}
            >
              {CASH_MOVEMENT_CATEGORY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {CASH_MOVEMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Monto (Bs)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Motivo</label>
            <input
              type="text"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="opcional"
              maxLength={500}
            />
          </div>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
        <div className="mt-3">
          <SubmitButton
            type="button"
            onClick={() => {
              const a = Number(amount);
              if (!Number.isFinite(a) || a <= 0) {
                setError('El monto debe ser > 0');
                return;
              }
              createMutation.mutate();
            }}
            isSubmitting={createMutation.isPending}
            loadingText="Registrando…"
            disabled={amount === ''}
          >
            Registrar movimiento
          </SubmitButton>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Movimientos del día</h2>
        </div>
        {items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Sin movimientos hoy.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((m) => {
                const isIn = m.type === 'CASH_IN';
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(m.createdAt).toLocaleTimeString('es-BO')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {CASH_MOVEMENT_TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {CASH_MOVEMENT_CATEGORY_LABELS[m.category]}
                    </td>
                    <td className="px-4 py-3 text-xs italic text-slate-600">
                      {m.reason ?? '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        isIn ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {isIn ? '+' : '−'} Bs {Number(m.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {m.createdByUserId.slice(-8)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'in' | 'out' | 'neutral';
}): ReactNode {
  const toneClass =
    tone === 'in'
      ? 'text-green-700'
      : tone === 'out'
        ? 'text-red-700'
        : 'text-slate-900';
  return (
    <div className="card p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
