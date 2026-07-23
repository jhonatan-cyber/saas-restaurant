import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { plansApi, type PlanItem } from '~/lib';
import { RoutePending, Skeleton } from '~/components';
import { Pagination } from '~/components/ui';

export const Route = createFileRoute('/_authed/plans')({
  component: PlansPage,
  pendingComponent: RoutePending,
});

const BILLING_LABELS: Record<string, string> = {
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  QUARTERLY: 'Trimestral',
};

function PlansPage(): ReactNode {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['plans', 'list', { page, search }],
    queryFn: () => plansApi.list({ page, pageSize: 50, search: search || undefined }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planes</h1>
        <Link
          to="/plans/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo plan
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar planes..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>

      <Skeleton name="plans-grid" loading={isLoading}>
        {data && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.data.length === 0 && (
              <p className="text-zinc-500 col-span-full">No hay planes registrados.</p>
            )}
            {data.data.map((plan: PlanItem) => (
              <div
                key={plan.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => navigate({ to: '/plans/$id', params: { id: plan.id } })}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    plan.isActive
                      ? 'text-green-400 border-green-800 bg-green-900/30'
                      : 'text-zinc-500 border-zinc-700'
                  }`}>
                    {plan.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {plan.description && (
                  <p className="mb-3 text-sm text-zinc-400 line-clamp-2">{plan.description}</p>
                )}
                <p className="mb-4 text-2xl font-bold text-white">
                  ${Number(plan.price).toLocaleString()}
                  <span className="text-sm font-normal text-zinc-400">
                    /{BILLING_LABELS[plan.billingPeriod] || plan.billingPeriod}
                  </span>
                </p>
                <div className="space-y-1 text-sm text-zinc-300">
                  <p>👤 Hasta {plan.maxUsers} usuarios</p>
                  <p>🏪 Hasta {plan.maxBranches} sucursales</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Skeleton>

      <Pagination
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total}
        onPageChange={setPage}
      />
    </div>
  );
}
