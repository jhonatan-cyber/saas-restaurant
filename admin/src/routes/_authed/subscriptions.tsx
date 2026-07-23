import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { adminApi, plansApi, type PlanItem } from '~/lib';
import { RoutePending, Skeleton } from '~/components';
import { Pagination } from '~/components/ui';

export const Route = createFileRoute('/_authed/subscriptions')({
  component: SubscriptionsPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-900/30 border-green-800',
  TRIALING: 'text-amber-400 bg-amber-900/30 border-amber-800',
  PAST_DUE: 'text-red-400 bg-red-900/30 border-red-800',
  CANCELLED: 'text-zinc-500 bg-zinc-900 border-zinc-700',
  EXPIRED: 'text-zinc-500 bg-zinc-900 border-zinc-700',
};

function SubscriptionsPage(): ReactNode {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const { data: plansData } = useQuery({
    queryKey: ['plans', 'list'],
    queryFn: () => plansApi.list({ page: 1, pageSize: 50 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', { page, status: statusFilter, planId: planFilter }],
    queryFn: () => adminApi.listSubscriptions({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter || undefined,
      planId: planFilter || undefined,
    }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Suscripciones</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="TRIALING">TRIALING</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los planes</option>
          {(plansData?.data ?? []).map((p: PlanItem) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <span className="text-sm text-zinc-500 self-center">
          {data ? `${data.meta.total} suscripciones` : ''}
        </span>
      </div>

      <Skeleton name="subscriptions-table" loading={isLoading}>
        {data && (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Negocio</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Inicio período</th>
                    <th className="px-4 py-3">Fin período</th>
                    <th className="px-4 py-3">Facturación</th>
                    <th className="px-4 py-3">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                        No hay suscripciones registradas.
                      </td>
                    </tr>
                  )}
                  {data.data.map((sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-zinc-800/30 cursor-pointer"
                      onClick={() => navigate({ to: '/businesses/$id', params: { id: sub.businessId } })}
                    >
                      <td className="px-4 py-3 font-medium text-white">{sub.business.name}</td>
                      <td className="px-4 py-3 text-zinc-300">{sub.plan.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[sub.status] || 'text-zinc-400'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {new Date(sub.currentPeriodStart).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        ${Number(sub.plan.price).toLocaleString()}/{sub.plan.billingPeriod.toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Skeleton>
    </div>
  );
}
