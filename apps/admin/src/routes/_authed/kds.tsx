import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { KdsOrderCard } from '~/components/kds-order-card';
import { ordersApi, type KdsOrder } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { useRealtimeStore } from '~/lib/realtime-store';
import type { OrderStatus } from '@saas/shared';

/**
 * Pantalla de Cocina (KDS - Kitchen Display System).
 * - Columnas por área de preparación.
 * - Cada card es una orden en SENT_TO_KITCHEN, IN_PREPARATION o READY.
 * - Refetch cada 30s como fallback al WS.
 * - Role guard: COCINA, ADMIN, OWNER.
 */
export const Route = createFileRoute('/_authed/kds')({
  component: KdsPage,
});

const ALLOWED_KDS_ROLES = ['COCINA', 'ADMIN', 'OWNER'] as const;

function KdsPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const wsStatus = useRealtimeStore((s) => s.status);

  const branchId = user?.defaultBranchId ?? user?.branches[0]?.id ?? null;

  const kdsQuery = useQuery({
    queryKey: ['orders', 'kds', branchId],
    queryFn: () =>
      ordersApi.kds({
        branchId: branchId!,
        states: ['SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY'],
      }),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ orderId, to }: { orderId: string; to: OrderStatus }) => {
      // Obtener la versión actual de la orden para optimistic lock
      // (el KDS view no incluye el campo version, hacemos un fetch puntual)
      const order = await ordersApi.get(orderId);
      return ordersApi.transition(orderId, { to, expectedVersion: order.version });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'kds', branchId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      ordersApi.cancel(orderId, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'kds', branchId] });
    },
  });

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  if (!ALLOWED_KDS_ROLES.includes(user.role as (typeof ALLOWED_KDS_ROLES)[number])) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu rol ({user.role}) no tiene acceso a la cocina.
        </p>
        <Link to="/dashboard" className="btn-primary mt-4 inline-block">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Sin sucursal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Necesitás al menos una sucursal configurada para ver la cocina.
        </p>
      </div>
    );
  }

  const areas = kdsQuery.data?.areas ?? [];
  const totalOrders = areas.reduce((sum, a) => sum + a.orders.length, 0);
  const branchName = user.branches.find((b) => b.id === branchId)?.name ?? 'Sucursal';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cocina</h1>
          <p className="text-sm text-slate-500">
            {branchName} · {totalOrders} {totalOrders === 1 ? 'orden activa' : 'órdenes activas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionPill status={wsStatus} />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['orders', 'kds', branchId] })}
          >
            Refrescar
          </button>
        </div>
      </div>

      {/* Loading / error */}
      {kdsQuery.isLoading ? (
        <div className="card p-8 text-center text-slate-500">Cargando cocina…</div>
      ) : kdsQuery.error ? (
        <div className="card p-8 text-center text-red-600">
          Error al cargar la cocina
        </div>
      ) : areas.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No hay áreas de preparación activas
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {areas.map((area) => (
            <div
              key={area.preparationAreaId}
              className="flex w-72 shrink-0 flex-col gap-2"
            >
              {/* Column header */}
              <div className="flex items-center justify-between rounded-md bg-slate-800 px-3 py-2 text-white">
                <h2 className="text-sm font-semibold uppercase tracking-wide">
                  {area.preparationAreaName}
                </h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-900 tabular-nums">
                  {area.orders.length}
                </span>
              </div>

              {/* Cards */}
              {area.orders.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                  Sin órdenes
                </div>
              ) : (
                area.orders.map((order: KdsOrder) => (
                  <KdsOrderCard
                    key={order.id}
                    order={order}
                    isTransitionPending={
                      transitionMutation.isPending &&
                      transitionMutation.variables?.orderId === order.id
                    }
                    isCancelPending={
                      cancelMutation.isPending &&
                      cancelMutation.variables?.orderId === order.id
                    }
                    onTransition={(to) => {
                      transitionMutation.mutate({ orderId: order.id, to });
                    }}
                    onCancel={(reason) => {
                      cancelMutation.mutate({ orderId: order.id, reason });
                    }}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionPill({ status }: { status: 'disconnected' | 'connecting' | 'connected' }): ReactNode {
  const map = {
    connected: { color: 'bg-green-500', text: 'En vivo' },
    connecting: { color: 'bg-yellow-500', text: 'Conectando…' },
    disconnected: { color: 'bg-red-500', text: 'Sin conexión' },
  } as const;
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      <span className={`h-2 w-2 rounded-full ${m.color}`} />
      {m.text}
    </span>
  );
}
