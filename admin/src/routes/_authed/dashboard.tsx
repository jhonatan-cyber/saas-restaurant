import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { adminApi } from '~/lib';
import { RoutePending, Skeleton } from '~/components';

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
  pendingComponent: RoutePending,
});

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color, unit }: {
  data: Array<{ month: string; businesses: number; orders: number; revenue: number }>;
  labelKey: 'businesses' | 'orders' | 'revenue';
  valueKey: 'businesses' | 'orders' | 'revenue';
  color: string;
  unit?: string;
}) {
  const values = data.map((d) => Number(d[valueKey]));
  const max = Math.max(...values, 1);
  const fmt = (v: number) => unit === '$' ? `$${v.toLocaleString()}` : String(v);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {labelKey === 'businesses' ? 'Nuevos negocios' : labelKey === 'orders' ? 'Órdenes' : 'Ingresos'}
      </p>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {data.map((d) => {
          const h = (Number(d[valueKey]) / max) * 100;
          return (
            <div key={d.month} className="flex flex-1 flex-col items-center justify-end h-full gap-1">
              <span className="text-[10px] leading-none text-zinc-500">{fmt(Number(d[valueKey]))}</span>
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{ height: `${Math.max(h, 2)}%`, backgroundColor: color }}
              />
              <span className="text-[10px] leading-none text-zinc-500">
                {d.month.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardPage(): ReactNode {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: () => adminApi.getDashboardStats(),
  });

  const { data: series } = useQuery({
    queryKey: ['admin', 'dashboard', 'series'],
    queryFn: () => adminApi.getDashboardSeries(),
  });

  const { data: businesses } = useQuery({
    queryKey: ['admin', 'dashboard', 'recent-businesses'],
    queryFn: () => adminApi.listBusinesses({ page: 1, pageSize: 5 }),
  });

  const { data: audit } = useQuery({
    queryKey: ['admin', 'dashboard', 'recent-audit'],
    queryFn: () => adminApi.listAuditLogs({ page: 1, pageSize: 8 }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <Skeleton name="stats-cards" loading={statsLoading}>
        {stats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Negocios registrados" value={stats.totalBusinesses} color="text-blue-400" />
            <StatCard label="Usuarios totales" value={stats.totalUsers} color="text-green-400" />
            <StatCard label="Suscripciones activas" value={stats.activeSubscriptions} color="text-emerald-400" />
            <StatCard label="Órdenes totales" value={stats.totalOrders} color="text-amber-400" />
          </div>
        )}
      </Skeleton>

      {series && series.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <BarChart data={series} labelKey="businesses" valueKey="businesses" color="#3b82f6" />
          <BarChart data={series} labelKey="orders" valueKey="orders" color="#f59e0b" />
          <BarChart data={series} labelKey="revenue" valueKey="revenue" color="#10b981" unit="$" />
        </div>
      )}

      {/* Últimos negocios */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Últimos negocios</h2>
          <Skeleton name="recent-businesses" loading={!businesses}>
            {businesses ? (
              businesses.data.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin negocios registrados.</p>
              ) : (
                <div className="space-y-1">
                  {businesses.data.map((b) => (
                    <div
                      key={b.id}
                      className="flex cursor-pointer items-center justify-between rounded px-3 py-2 hover:bg-zinc-800/50"
                      onClick={() => navigate({ to: '/businesses/$id', params: { id: b.id } })}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{b.name}</p>
                        <p className="text-xs text-zinc-500">{b.email}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        b.status === 'ACTIVE' ? 'border-green-800 bg-green-900/30 text-green-400'
                        : b.status === 'SUSPENDED' ? 'border-red-800 bg-red-900/30 text-red-400'
                        : 'border-amber-800 bg-amber-900/30 text-amber-400'
                      }`}>{b.status}</span>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </Skeleton>
        </div>

        {/* Actividad reciente */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">Actividad reciente</h2>
          <Skeleton name="recent-audit" loading={!audit}>
            {audit ? (
              audit.data.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin actividad registrada.</p>
              ) : (
                <div className="space-y-1">
                  {audit.data.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded px-3 py-1.5 text-sm">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        log.action === 'CREATE' ? 'border-green-800 bg-green-900/30 text-green-400'
                        : log.action === 'DELETE' ? 'border-red-800 bg-red-900/30 text-red-400'
                        : log.action === 'LOGIN' ? 'border-purple-800 bg-purple-900/30 text-purple-400'
                        : 'border-blue-800 bg-blue-900/30 text-blue-400'
                      }`}>{log.action}</span>
                      <span className="flex-1 px-2 text-zinc-300">{log.entity}</span>
                      <span className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </Skeleton>
        </div>
      </div>
    </div>
  );
}
