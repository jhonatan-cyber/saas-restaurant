import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { cashApi, ApiClientError, type ShiftListItem } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { SubmitButton } from '../../components/submit-button';
import { CASH_REGISTER_STATUS_LABELS } from '@saas/shared';

export const Route = createFileRoute('/_authed/cash')({
  component: CashPage,
});

/**
 * Pantalla de caja (FASE 4).
 *  - Muestra el estado del turno actual de la branch default.
 *  - Si NO hay turno abierto: lista cajas disponibles + input monto apertura
 *    + botón "Abrir turno".
 *  - Si HAY turno abierto: muestra apertura, arqueo esperado, permite
 *    "Hacer arqueo" (preview sin cerrar) y "Cerrar turno" (con monto cierre).
 *  - Tabla con últimos turnos.
 */
function CashPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.defaultBranchId ?? user?.branches?.[0]?.id ?? null;
  const queryClient = useQueryClient();

  const [openingAmount, setOpeningAmount] = useState('0');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [arqueoPreview, setArqueoPreview] = useState<{
    openingAmount: string;
    cashPaymentsTotal: string;
    cashMovementsInTotal: string;
    cashMovementsOutTotal: string;
    expectedAmount: string;
  } | null>(null);

  const registersQuery = useQuery({
    queryKey: ['cash', 'registers', { branchId }],
    queryFn: () => cashApi.listRegisters(branchId!),
    enabled: !!branchId,
  });

  const currentShiftQuery = useQuery({
    queryKey: ['cash', 'shifts', 'current', { branchId }],
    queryFn: () => cashApi.getCurrentShift(branchId!),
    enabled: !!branchId,
  });

  const shiftsQuery = useQuery({
    queryKey: ['cash', 'shifts', 'list', { branchId }],
    queryFn: () => cashApi.listShifts({ branchId: branchId!, pageSize: 10 }),
    enabled: !!branchId,
  });

  const openMutation = useMutation({
    mutationFn: (data: { cashRegisterId: string; openingAmount: number }) =>
      cashApi.openShift(data, branchId!),
    onSuccess: () => {
      setError(null);
      setOpeningAmount('0');
      void queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiClientError) setError(err.message);
      else setError('Error al abrir el turno');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (data: { id: string; closingAmount: number; closingNotes?: string }) =>
      cashApi.closeShift(data.id, { closingAmount: data.closingAmount, closingNotes: data.closingNotes }, branchId!),
    onSuccess: () => {
      setError(null);
      setClosingAmount('');
      setClosingNotes('');
      setArqueoPreview(null);
      void queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiClientError) setError(err.message);
      else setError('Error al cerrar el turno');
    },
  });

  const arqueoQuery = useMutation({
    mutationFn: (id: string) => cashApi.getArqueo(id, branchId!),
    onSuccess: (data) => {
      setError(null);
      setArqueoPreview(data);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiClientError) setError(err.message);
      else setError('Error al obtener el arqueo');
    },
  });

  if (!branchId) {
    return (
      <div className="card p-8 text-center text-slate-500">
        No tenés una sucursal asignada. Pedile al administrador que te asigne una.
      </div>
    );
  }

  const registers = registersQuery.data ?? [];
  const currentShift = currentShiftQuery.data;
  const shifts = (shiftsQuery.data?.data ?? []) as ShiftListItem[];
  const opening = Number(openingAmount) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Caja</h1>
        <p className="mt-1 text-sm text-slate-500">
          Abrí, controlá y cerrá tu turno de caja.
        </p>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Turno actual */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Turno actual</h2>
        {currentShiftQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Cargando…</p>
        ) : currentShift ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Field
                label="Estado"
                value={<span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">ABIERTO</span>}
              />
              <Field
                label="Apertura"
                value={`Bs ${Number(currentShift.openingAmount).toFixed(2)}`}
              />
              <Field
                label="Abierto a las"
                value={new Date(currentShift.openedAt).toLocaleString('es-BO')}
              />
              <Field
                label="Cajero"
                value={currentShift.userId.slice(-8)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => arqueoQuery.mutate(currentShift.id)}
                disabled={arqueoQuery.isPending}
              >
                {arqueoQuery.isPending ? 'Calculando…' : 'Hacer arqueo'}
              </button>
              <div className="ml-auto flex flex-1 items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Monto de cierre (Bs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-slate-500">Notas (opcional)</label>
                  <input
                    type="text"
                    className="input"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="ej. diferencia por vuelto mal dado"
                    maxLength={500}
                  />
                </div>
                <SubmitButton
                  type="button"
                  onClick={() => {
                    const c = Number(closingAmount);
                    if (!Number.isFinite(c) || c < 0) {
                      setError('Monto de cierre inválido');
                      return;
                    }
                    closeMutation.mutate({
                      id: currentShift.id,
                      closingAmount: c,
                      closingNotes: closingNotes.trim() || undefined,
                    });
                  }}
                  isSubmitting={closeMutation.isPending}
                  loadingText="Cerrando…"
                  disabled={closingAmount === ''}
                >
                  Cerrar turno
                </SubmitButton>
              </div>
            </div>
            {arqueoPreview && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Arqueo (preview, no cierra el turno)
                </p>
                <div className="mt-2 space-y-1">
                  <ArqueoRow label="Apertura" value={arqueoPreview.openingAmount} />
                  <ArqueoRow label="+ Cobros en efectivo" value={arqueoPreview.cashPaymentsTotal} />
                  <ArqueoRow label="+ Ingresos de caja" value={arqueoPreview.cashMovementsInTotal} />
                  <ArqueoRow label="− Egresos de caja" value={`-${arqueoPreview.cashMovementsOutTotal}`} />
                  <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1 text-base font-bold text-slate-900">
                    <span>Esperado en caja</span>
                    <span className="tabular-nums">Bs {Number(arqueoPreview.expectedAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-500">
              No hay un turno abierto en esta sucursal.
            </p>
            {registersQuery.isLoading ? (
              <p className="text-xs text-slate-400">Cargando cajas…</p>
            ) : registers.length === 0 ? (
              <p className="text-xs text-amber-600">
                No hay cajas registradas para esta sucursal. Pedile al admin que cree una (OWNER/ADMIN).
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Caja</label>
                  <select
                    id="cash-register"
                    className="input"
                    defaultValue={registers.find((r) => r.isPrimary)?.id ?? registers[0]?.id}
                  >
                    {registers
                      .filter((r) => r.status === 'OPEN')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code}) {r.isPrimary ? '· principal' : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Monto apertura (Bs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <SubmitButton
                    type="button"
                    onClick={() => {
                      const select = document.getElementById('cash-register') as HTMLSelectElement;
                      const cashRegisterId = select?.value;
                      if (!cashRegisterId) {
                        setError('Seleccioná una caja');
                        return;
                      }
                      openMutation.mutate({ cashRegisterId, openingAmount: opening });
                    }}
                    isSubmitting={openMutation.isPending}
                    loadingText="Abriendo…"
                    fullWidth
                  >
                    Abrir turno
                  </SubmitButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Últimos turnos</h2>
        </div>
        {shifts.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Sin turnos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Apertura</th>
                <th className="px-4 py-3">Cierre</th>
                <th className="px-4 py-3 text-right">Apertura</th>
                <th className="px-4 py-3 text-right">Cierre</th>
                <th className="px-4 py-3 text-right">Esperado</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shifts.map((s) => {
                const diff = s.difference ? Number(s.difference) : 0;
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(s.openedAt).toLocaleString('es-BO')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {s.closedAt ? new Date(s.closedAt).toLocaleString('es-BO') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      Bs {Number(s.openingAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.closingAmount ? `Bs ${Number(s.closingAmount).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.closingAmount ? `Bs ${(Number(s.openingAmount) + diff).toFixed(2)}` : '—'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${
                        diff === 0
                          ? 'text-slate-500'
                          : diff > 0
                            ? 'text-green-700'
                            : 'text-red-700'
                      }`}
                    >
                      {s.closingAmount ? `Bs ${diff.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          s.status === 'OPEN'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {CASH_REGISTER_STATUS_LABELS[s.status]}
                      </span>
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

function Field({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-slate-900">{value}</p>
    </div>
  );
}

function ArqueoRow({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular-nums">Bs {Number(value).toFixed(2)}</span>
    </div>
  );
}
