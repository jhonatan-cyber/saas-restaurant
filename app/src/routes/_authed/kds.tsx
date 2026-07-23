import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ordersApi } from '~/lib/api';
import { useBranchStore } from '~/lib/branch-store';
import { KdsOrderCard, RoutePending, Skeleton } from '~/components';
import { useKdsSounds } from '~/lib/use-kds-sounds';
import type { OrderStatus, KdsOrderDTO } from '@saas/shared';

export const Route = createFileRoute('/_authed/kds')({
  component: KdsPage,
  pendingComponent: RoutePending,
});

function KdsPage(): ReactNode {
  const branchId = useBranchStore((s) => s.activeBranchId);
  const queryClient = useQueryClient();
  const { muted, toggleMuted } = useKdsSounds();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');

  const kdsQuery = useQuery({
    queryKey: ['orders', 'kds', { branchId }],
    queryFn: () => ordersApi.kds({ branchId: branchId ?? '' }),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ orderId, to }: { orderId: string; to: OrderStatus }) =>
      ordersApi.transition(orderId, { to, expectedVersion: undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'kds'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      ordersApi.cancel(orderId, { reason, expectedVersion: undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders', 'kds'] });
    },
  });

  const kdsView = kdsQuery.data;
  // Flatten all orders from all areas
  const allOrders: KdsOrderDTO[] = kdsView?.areas.flatMap((a) => a.orders) ?? [];

  const filtered = statusFilter === 'ALL'
    ? allOrders
    : allOrders.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KDS — Cocina</h1>
          <p className="text-sm text-slate-500 mt-1">
            Órdenes enviadas a cocina en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMuted}
            className="btn-secondary text-xs px-2 py-1"
            title={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Todas ({allOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('SENT_TO_KITCHEN')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'SENT_TO_KITCHEN' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Nuevas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_PREPARATION')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'IN_PREPARATION' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            En prep.
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('READY')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'READY' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Listas
          </button>
        </div>
      </div>

      <Skeleton name="kds-orders" loading={kdsQuery.isLoading}>
        {kdsQuery.error ? (
          <div className="p-8 text-center text-red-600">Error al cargar órdenes</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay órdenes en cocina.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => (
              <KdsOrderCard
                key={order.id}
                order={order}
                onTransition={(to) => transitionMutation.mutate({ orderId: order.id, to })}
                onCancel={(reason) => cancelMutation.mutate({ orderId: order.id, reason })}
                isTransitionPending={transitionMutation.isPending}
                isCancelPending={cancelMutation.isPending}
              />
            ))}
          </div>
        )}
      </Skeleton>
    </div>
  );
}
