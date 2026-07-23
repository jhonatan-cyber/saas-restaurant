import type { ReactNode } from 'react';
import { ROLE_LABELS } from '@saas/shared';
import type { DashboardMetrics } from '~/lib/api';
import type { AuthenticatedUserDTO } from '@saas/shared';

interface DashboardHeroProps {
  user: AuthenticatedUserDTO;
  metrics?: DashboardMetrics;
  mounted: boolean;
}

export function DashboardHero({ user, metrics, mounted }: DashboardHeroProps): ReactNode {
  const activeOrdersCount = metrics?.activeOrdersByStatus.total ?? 0;
  const ts = metrics?.tablesSummary;
  const freeTables = ts?.free ?? 0;
  const totalTables = ts?.total ?? 0;
  const occupiedTables = ts?.occupied ?? 0;
  const occupancyPct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white lg:p-8"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s ease-out',
      }}
    >
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Bienvenido, {user.fullName.split(' ')[0]}
              </h1>
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-slate-300 ring-1 ring-white/30">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-400">
              {user.business.name} · {user.business.plan}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {new Date().toLocaleDateString('es-BO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Mini metrics row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Ventas hoy',
              value: metrics?.todaySales.total
                ? `$${Number(metrics.todaySales.total).toLocaleString('es-BO')}`
                : '$0',
              color: 'text-slate-100',
            },
            { label: 'Órdenes activas', value: activeOrdersCount, color: 'text-slate-100' },
            { label: 'Mesas ocupadas', value: `${occupiedTables}/${totalTables}`, color: 'text-slate-100' },
            { label: 'Ocupación', value: `${occupancyPct}%`, color: 'text-slate-100' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                transition: `all 0.5s ease-out ${0.3 + i * 0.1}s`,
              }}
            >
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className={`mt-0.5 text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
