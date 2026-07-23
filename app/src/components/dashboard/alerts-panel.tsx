import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertIcon, CurrencyIcon } from './icons';
import type { DashboardMetrics } from '~/lib/api';

interface AlertsPanelProps {
  metrics?: DashboardMetrics;
  mounted: boolean;
}

export function AlertsPanel({ metrics, mounted }: AlertsPanelProps): ReactNode {
  const c = metrics?.counts;
  const ts = metrics?.tablesSummary;
  const freeTables = ts?.free ?? 0;
  const occupiedTables = ts?.occupied ?? 0;
  const totalTables = ts?.total ?? 0;

  return (
    <div>
      <h2
        className="mb-3 text-sm font-semibold text-slate-900"
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'all 0.5s ease-out 0.6s',
        }}
      >
        Alertas & Estado
      </h2>

      {/* Low Stock Alert */}
      {(c?.lowStock ?? 0) > 0 && (
        <div
          className="mb-3 overflow-hidden rounded-xl border border-red-200/80 bg-white"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s ease-out 0.65s',
          }}
        >
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/50 px-4 py-2.5">
            <AlertIcon className="h-4 w-4 text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
              Stock bajo ({c?.lowStock})
            </span>
          </div>
          <div className="px-4 py-3 text-center">
            <Link to="/inventory" className="text-xs font-medium text-red-600 hover:text-red-700">
              Ir a inventario
            </Link>
          </div>
        </div>
      )}

      {/* Table Occupancy */}
      {ts && totalTables > 0 && (
        <div
          className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s ease-out 0.7s',
          }}
        >
          <div className="border-b border-slate-200 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Ocupación del salón
            </span>
          </div>

          {/* Bar */}
          <div className="px-4 pt-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="bg-emerald-400 transition-all duration-1000 ease-out"
                style={{ width: `${(freeTables / totalTables) * 100}%` }}
              />
              <div
                className="bg-amber-400 transition-all duration-1000 delay-200 ease-out"
                style={{ width: `${(occupiedTables / totalTables) * 100}%` }}
              />
              <div
                className="bg-slate-300 transition-all duration-1000 delay-400 ease-out"
                style={{ width: `${((ts.reserved ?? 0) / totalTables) * 100}%` }}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 px-2 pb-4 pt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{freeTables}</p>
              <p className="text-xs text-slate-500">Libres</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600">{occupiedTables}</p>
              <p className="text-xs text-slate-500">Ocupadas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-500">{ts.reserved}</p>
              <p className="text-xs text-slate-500">Reservadas</p>
            </div>
          </div>
        </div>
      )}

      {/* Average ticket */}
      <div
        className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.5s ease-out 0.75s',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Ticket promedio</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {metrics?.todaySales.average
            ? `$${Number(metrics.todaySales.average).toLocaleString('es-BO')}`
            : '$0'}
        </p>
        <p className="mt-1 text-xs text-slate-400">{metrics?.todaySales.count ?? 0} órdenes pagadas hoy</p>
      </div>
    </div>
  );
}
