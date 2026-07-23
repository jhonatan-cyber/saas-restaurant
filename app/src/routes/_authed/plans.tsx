import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { plansApi, ApiClientError, type PlanFilters } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog, RoutePending } from '~/components';
import { BillingPeriod, BILLING_PERIOD_LABELS } from '@saas/shared';
import { SaaSRole } from '@saas/shared';

export const Route = createFileRoute('/_authed/plans')({
  component: PlansListPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 50;

interface PlanItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  billingPeriod: string;
  maxUsers: number;
  maxBranches: number;
  isActive: boolean;
  sortOrder: number;
  isPublic: boolean;
}

function PlansListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<PlanFilters>({
    page: 1,
    pageSize: PAGE_SIZE,
    isActive: undefined,
    search: undefined,
  });
  const [searchInput, setSearchInput] = useState('');
  const [planToDelete, setPlanToDelete] = useState<PlanItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['plans', filters],
    queryFn: () => plansApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plans'] });
      setPlanToDelete(null);
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al eliminar';
      setActionError(msg);
    },
  });

  const handleSearch = (): void => {
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
  };

  const isSuperAdmin = (user?.role as string) === SaaSRole.SUPER_ADMIN;

  const formatPrice = (price: string, currency: string): string => {
    const n = Number(price);
    return new Intl.NumberFormat('es', { style: 'currency', currency }).format(n);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los planes de suscripción del sistema
          </p>
        </div>
        {isSuperAdmin && (
          <Link to="/plans/new" className="btn-primary">
            + Nuevo plan
          </Link>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre o código..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
            <button className="btn-secondary" onClick={handleSearch}>Buscar</button>
          </div>
          <select
            className="input"
            value={filters.isActive === undefined ? '' : String(filters.isActive)}
            onChange={(e) => {
              const val = e.target.value;
              setFilters((f) => ({
                ...f,
                isActive: val === '' ? undefined : val === 'true',
                page: 1,
              }));
            }}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando...</div>
        ) : listQuery.isError ? (
          <div className="p-8 text-center text-red-500">
            Error: {listQuery.error instanceof ApiClientError ? listQuery.error.message : 'Error desconocido'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Ciclo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Límites</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Orden</th>
                  {isSuperAdmin && <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listQuery.data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-400">
                      No hay planes
                    </td>
                  </tr>
                ) : (
                  listQuery.data?.data.map((p: PlanItem) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-slate-900">{p.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {formatPrice(p.price, p.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {BILLING_PERIOD_LABELS[p.billingPeriod as keyof typeof BILLING_PERIOD_LABELS] ?? p.billingPeriod}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {p.maxUsers} users · {p.maxBranches} suc.
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {p.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">{p.sortOrder}</td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to="/plans/$id"
                              params={{ id: p.id }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Editar
                            </Link>
                            <button
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                              onClick={() => setPlanToDelete(p)}
                            >
                              {p.isActive ? 'Desactivar' : 'Eliminar'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {listQuery.data?.meta && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-sm text-slate-500">
              Pág. {listQuery.data.meta.page} de {listQuery.data.meta.totalPages} ({listQuery.data.meta.total} planes)
            </div>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-sm"
                disabled={listQuery.data.meta.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page! - 1 }))}
              >Anterior</button>
              <button
                className="btn-secondary text-sm"
                disabled={listQuery.data.meta.page >= listQuery.data.meta.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page! + 1 }))}
              >Siguiente</button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={planToDelete !== null}
        title={`${planToDelete?.isActive ? 'Desactivar' : 'Eliminar'} plan`}
        message={
          planToDelete
            ? planToDelete.isActive
              ? `¿Desactivar "${planToDelete.name}"? Los negocios con este plan no se verán afectados.`
              : `¿Eliminar "${planToDelete.name}" permanentemente? No se puede deshacer.`
            : ''
        }
        confirmText={planToDelete?.isActive ? 'Desactivar' : 'Eliminar'}
        isLoading={deleteMutation.isPending}
        onConfirm={() => { if (planToDelete) deleteMutation.mutate(planToDelete.id); }}
        onCancel={() => { setPlanToDelete(null); setActionError(null); }}
      />
    </div>
  );
}
