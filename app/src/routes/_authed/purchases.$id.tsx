import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { purchasesApi, ApiClientError } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog, RoutePending, StatusBadge } from '~/components';

export const Route = createFileRoute('/_authed/purchases/$id')({
  component: PurchaseDetailPage,
  pendingComponent: RoutePending,
});

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Anulada',
};

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

function PurchaseDetailPage(): ReactNode {
  const { id } = useParams({ strict: false }) as { id: string };
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ['purchases', id],
    queryFn: () => purchasesApi.get(id),
  });

  const completeMutation = useMutation({
    mutationFn: () => purchasesApi.complete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setCompleteDialogOpen(false);
      setActionError(null);
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiClientError ? err.message : 'Error al completar');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => purchasesApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setCancelDialogOpen(false);
      setActionError(null);
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiClientError ? err.message : 'Error al cancelar');
    },
  });

  const canWrite = user?.role === 'OWNER' || user?.role === 'ADMIN';

  if (isLoading) return <p className="text-slate-500">Cargando…</p>;
  if (error) return <p className="text-red-600">Error: {String(error)}</p>;
  if (!purchase) return <p className="text-slate-500">Compra no encontrada</p>;

  const isPending = purchase.status === 'PENDING';

  return (
    <div className="space-y-6">
      <div>
        <Link to="/purchases" className="text-sm text-slate-500 hover:text-slate-700">
          ← Compras
        </Link>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{purchase.purchaseNumber}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {new Date(purchase.createdAt).toLocaleString()} · Proveedor:{' '}
              {purchase.supplier?.name ?? 'Sin proveedor'}
            </p>
          </div>
          <StatusBadge
            label={STATUS_LABELS[purchase.status] ?? purchase.status}
            variant={STATUS_VARIANTS[purchase.status] ?? 'neutral'}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Producto</th>
                <th className="px-6 py-3 text-right">Cantidad</th>
                <th className="px-6 py-3 text-right">Costo unit.</th>
                <th className="px-6 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {purchase.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{item.productName}</td>
                  <td className="px-6 py-3 text-right text-slate-700">{Number(item.quantity).toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-slate-700">${Number(item.unitCost).toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-medium text-slate-900">${Number(item.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-medium">
              <tr>
                <td colSpan={3} className="px-6 py-3 text-right text-slate-600">Subtotal</td>
                <td className="px-6 py-3 text-right text-slate-900">${Number(purchase.subtotal).toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="px-6 py-3 text-right text-slate-600">Impuesto</td>
                <td className="px-6 py-3 text-right text-slate-900">${Number(purchase.taxTotal).toFixed(2)}</td>
              </tr>
              <tr className="text-base">
                <td colSpan={3} className="px-6 py-3 text-right text-slate-800">Total</td>
                <td className="px-6 py-3 text-right font-bold text-slate-900">${Number(purchase.total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {purchase.notes && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-1">Notas</h3>
          <p className="text-sm text-slate-600">{purchase.notes}</p>
        </div>
      )}

      {actionError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {canWrite && isPending && (
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={() => setCompleteDialogOpen(true)}>
            Completar compra
          </button>
          <button className="btn-danger" onClick={() => setCancelDialogOpen(true)}>
            Cancelar compra
          </button>
        </div>
      )}

      <ConfirmDialog
        open={completeDialogOpen}
        title="Completar compra"
        message={
          <div>
            <p>¿Confirmar recepción de esta compra?</p>
            <p className="mt-2 text-xs text-slate-500">
              Se generarán los movimientos de inventario y se actualizará el stock de los productos.
            </p>
          </div>
        }
        confirmText="Completar"
        isLoading={completeMutation.isPending}
        onCancel={() => setCompleteDialogOpen(false)}
        onConfirm={() => completeMutation.mutate()}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        title="Cancelar compra"
        message={<p>¿Anular esta compra? Esta acción no se puede deshacer.</p>}
        confirmText="Cancelar compra"
        isLoading={cancelMutation.isPending}
        onCancel={() => setCancelDialogOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}
