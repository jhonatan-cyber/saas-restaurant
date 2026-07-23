import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { adminApi, plansApi, type PlanItem } from '~/lib';
import { ConfirmDialog, RoutePending, Skeleton } from '~/components';
import { sileo } from 'sileo';

export const Route = createFileRoute('/_authed/businesses/$id')({
  component: BusinessDetailPage,
  pendingComponent: RoutePending,
});

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-900/30 border-green-800',
  SUSPENDED: 'text-red-400 bg-red-900/30 border-red-800',
  TRIAL: 'text-amber-400 bg-amber-900/30 border-amber-800',
};

const SUB_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400',
  TRIAL: 'text-amber-400',
  PAST_DUE: 'text-red-400',
  CANCELLED: 'text-zinc-500',
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm text-white">{value ?? '—'}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

function BusinessDetailPage(): ReactNode {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'business', id],
    queryFn: () => adminApi.getBusinessDetail(id),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans', 'list'],
    queryFn: () => plansApi.list({ page: 1, pageSize: 50 }),
  });

  const assignMutation = useMutation({
    mutationFn: (planId: string) => adminApi.assignPlan(id, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'business', id] });
      setSelectedPlanId('');
      sileo.success({ title: 'Plan asignado correctamente' });
    },
    onError: (err: Error) => sileo.error({ title: err.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => adminApi.cancelSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'business', id] });
      setConfirmCancelOpen(false);
      sileo.success({ title: 'Suscripción cancelada' });
    },
    onError: (err: Error) => { sileo.error({ title: err.message }); setConfirmCancelOpen(false); },
  });

  if (error || (!isLoading && !data)) {
    return (
      <div>
        <Link to="/businesses" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block">← Volver a negocios</Link>
        <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-400 text-sm">
          {error ? String(error) : 'Negocio no encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/businesses" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block">← Volver a negocios</Link>

      <Skeleton name="business-detail-header" loading={isLoading}>
        {data && (
          <div className="flex items-center justify-between mb-6 mt-2">
            <div>
              <h1 className="text-2xl font-bold text-white">{data.name}</h1>
              <p className="text-sm text-zinc-500 mt-1">{data.slug}</p>
            </div>
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[data.status] || 'text-zinc-400'}`}>
              {data.status}
            </span>
          </div>
        )}
      </Skeleton>

      <Skeleton name="business-detail-cards" loading={isLoading}>
        {data && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">Información</h2>
              <InfoRow label="Email" value={data.email} />
              <InfoRow label="Teléfono" value={data.phone} />
              <InfoRow label="Razón social" value={data.legalName} />
              <InfoRow label="NIT" value={data.taxId} />
              <InfoRow label="Moneda" value={data.currency} />
              <InfoRow label="Zona horaria" value={data.timezone} />
              <InfoRow label="Creado" value={new Date(data.createdAt).toLocaleDateString()} />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">Suscripción</h2>

              {data.subscription ? (
                <div className="mb-4">
                  <div className="mb-3">
                    <span className="text-lg font-bold text-white">{data.subscription.plan || 'Sin plan'}</span>
                    <span className={`ml-2 text-xs ${SUB_STATUS_COLORS[data.subscription.status] || 'text-zinc-400'}`}>
                      {data.subscription.status}
                    </span>
                  </div>
                  <InfoRow label="Inicio período" value={new Date(data.subscription.currentPeriodStart).toLocaleDateString()} />
                  <InfoRow label="Fin período" value={new Date(data.subscription.currentPeriodEnd).toLocaleDateString()} />
                </div>
              ) : (
                <p className="text-zinc-500 text-sm mb-4">Sin suscripción activa</p>
              )}

              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Cambiar plan</p>
                <div className="flex gap-2">
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Seleccionar plan...</option>
                    {(plansData?.data ?? []).map((p: PlanItem) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${Number(p.price).toLocaleString()}/{p.billingPeriod.toLowerCase()})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => selectedPlanId && assignMutation.mutate(selectedPlanId)}
                    disabled={!selectedPlanId || assignMutation.isPending}
                    className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assignMutation.isPending ? '...' : 'Asignar'}
                  </button>
                </div>

                {data.subscription && data.subscription.status !== 'CANCELLED' && (
                  <div className="pt-2">
                    <button
                      onClick={() => setConfirmCancelOpen(true)}
                      disabled={cancelMutation.isPending}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar suscripción'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">Estadísticas</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Usuarios" value={data.stats.users} />
                <StatCard label="Sucursales" value={data.stats.branches} />
                <StatCard label="Órdenes" value={data.stats.orders} />
                <StatCard label="Productos" value={data.stats.products} />
                <StatCard label="Clientes" value={data.stats.customers} />
              </div>
            </div>
          </div>
        )}
      </Skeleton>

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Cancelar suscripción"
        message="¿Estás seguro de cancelar la suscripción de este negocio? El negocio perderá acceso a las funcionalidades del plan."
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setConfirmCancelOpen(false)}
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
