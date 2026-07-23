import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { adminApi, type BusinessListItem, plansApi } from '~/lib';
import { RoutePending, Skeleton } from '~/components';
import { Pagination } from '~/components/ui';

export const Route = createFileRoute('/_authed/businesses')({
  component: BusinessesPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-900/30 border-green-800',
  SUSPENDED: 'text-red-400 bg-red-900/30 border-red-800',
  TRIAL: 'text-amber-400 bg-amber-900/30 border-amber-800',
};

function BusinessesPage(): ReactNode {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data: plans } = useQuery({
    queryKey: ['plans', 'list'],
    queryFn: () => plansApi.list({ page: 1, pageSize: 50 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'businesses', { page, search, status: statusFilter, planCode: planFilter, dateFrom, dateTo }],
    queryFn: () => adminApi.listBusinesses({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      status: statusFilter || undefined,
      planCode: planFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  });

  function resetPage() { setPage(1); }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Negocios</h1>
        {data && <span className="text-sm text-zinc-500">{data.meta.total} resultado(s)</span>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, slug o email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          className="w-full max-w-md rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="TRIAL">TRIAL</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); resetPage(); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos los planes</option>
          {(plans?.data ?? []).map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          title="Fecha desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          title="Fecha hasta"
        />
      </div>

      <Skeleton name="businesses-table" loading={isLoading}>
        {data && (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Negocio</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3 text-right">Usuarios</th>
                    <th className="px-4 py-3 text-right">Sucursales</th>
                    <th className="px-4 py-3 text-right">Órdenes</th>
                    <th className="px-4 py-3">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.data.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                        No hay negocios registrados.
                      </td>
                    </tr>
                  )}
                  {data.data.map((b: BusinessListItem) => (
                    <tr key={b.id} className="hover:bg-zinc-800/50 cursor-pointer" onClick={() => navigate({ to: '/businesses/$id', params: { id: b.id } })}>
                      <td className="px-4 py-3 font-medium text-white">{b.name}</td>
                      <td className="px-4 py-3 text-zinc-400">{b.slug}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] || 'text-zinc-400'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{b.plan}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{b.usersCount}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{b.branchesCount}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{b.ordersCount}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(b.createdAt).toLocaleDateString()}
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
