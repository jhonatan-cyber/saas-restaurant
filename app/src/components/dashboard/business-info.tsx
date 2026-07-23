import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CurrencyIcon, ClockIcon, CrownIcon, BranchIcon } from './icons';
import type { AuthenticatedUserDTO } from '@saas/shared';

interface BusinessInfoProps {
  user: AuthenticatedUserDTO;
  mounted: boolean;
}

export function BusinessInfo({ user, mounted }: BusinessInfoProps): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Business Info */}
      <div
        className="rounded-xl border border-slate-200/80 bg-white p-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease-out 0.75s',
        }}
      >
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Información del negocio</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <CurrencyIcon className="mx-auto h-5 w-5 text-slate-500" />
            <p className="mt-1.5 text-lg font-bold text-slate-900">{user.business.currency}</p>
            <p className="text-xs text-slate-500">Moneda</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <ClockIcon className="mx-auto h-5 w-5 text-slate-500" />
            <p className="mt-1.5 text-lg font-bold text-slate-900">{user.business.timezone}</p>
            <p className="text-xs text-slate-500">Zona horaria</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <CrownIcon className="mx-auto h-5 w-5 text-slate-500" />
            <p className="mt-1.5 text-lg font-bold text-slate-900">{user.business.plan}</p>
            <p className="text-xs text-slate-500">Plan</p>
          </div>
        </div>
      </div>

      {/* Branches */}
      <div
        className="rounded-xl border border-slate-200/80 bg-white"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease-out 0.8s',
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <BranchIcon className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Sucursales ({user.branches.length})</h2>
          </div>
          <Link to="/branches" className="text-xs font-medium text-slate-600 hover:text-slate-800">
            Gestionar
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {user.branches.map((branch, i) => (
            <div
              key={branch.id}
              className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `all 0.4s ease-out ${0.85 + i * 0.1}s`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    branch.isMain ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {branch.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-900">{branch.name}</span>
                    {branch.isMain && (
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{branch.code}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  branch.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {branch.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
