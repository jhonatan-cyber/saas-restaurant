import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { branchesApi, type Branch } from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog, BranchForm, RoutePending } from '~/components';
import { OrbSpinner } from '@saas/ui';

export const Route = createFileRoute('/_authed/branches')({
  component: BranchesPage,
  pendingComponent: RoutePending,
});

function BranchesPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [branchToDeactivate, setBranchToDeactivate] = useState<Branch | null>(null);
  const [branchToReactivate, setBranchToReactivate] = useState<Branch | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const listQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list({ pageSize: 100 }),
  });

  const branches = listQuery.data?.data ?? [];

  const filteredBranches = branches.filter((b) => {
    const matchesSearch = !searchInput || b.name.toLowerCase().includes(searchInput.toLowerCase()) || b.code.toLowerCase().includes(searchInput.toLowerCase());
    const matchesStatus = statusFilter === '' || (statusFilter === 'ACTIVE' && b.status === 'ACTIVE') || (statusFilter === 'INACTIVE' && b.status !== 'ACTIVE');
    return matchesSearch && matchesStatus;
  });

  const selectedBranch = selectedBranchId ? branches.find((b) => b.id === selectedBranchId) : null;

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => branchesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      setBranchToDeactivate(null);
      setSelectedBranchId(null);
      setActionError(null);
    },
    onError: handleMutationError(setActionError, { fallback: 'Error al desactivar' }),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => branchesApi.reactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      setBranchToReactivate(null);
      setActionError(null);
    },
    onError: handleMutationError(setActionError, { fallback: 'Error al reactivar' }),
  });

  const canWrite = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const showEditForm = Boolean(selectedBranchId) && !isCreating;

  return (
    <div className="flex h-[calc(100dvh-7rem)] gap-4">
      {/* ── Panel izquierdo: toggle + lista ── */}
      <div className="flex w-80 shrink-0 flex-col rounded-2xl border border-slate-800/60 light:border-slate-200 bg-slate-900/80 light:bg-white/80 backdrop-blur-xl shadow-lg overflow-hidden">
        {/* Toggle tabs */}
        <div className="border-b border-slate-800/60 light:border-slate-200 p-2">
          <div className="flex gap-1 rounded-xl bg-slate-800/50 light:bg-slate-100 p-1">
            <button
              onClick={() => { setIsCreating(false); setSelectedBranchId(null); }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                !isCreating
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Sucursales
              </span>
            </button>
            {canWrite && (
              <button
                onClick={() => { setIsCreating(true); setSelectedBranchId(null); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isCreating
                    ? 'bg-white text-black shadow-sm'
                    : 'text-slate-400 light:text-slate-500 hover:text-slate-200 light:hover:text-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Nueva
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Contenido del panel izquierdo */}
      <div className="flex-1">
          {!isCreating && (
            <>
              {/* Buscador + filtros */}
              <div className="border-b border-slate-800/60 light:border-slate-200 p-3 space-y-2">
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/60 light:border-slate-300 bg-slate-800/50 light:bg-white pl-9 pr-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50 transition-all"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/60 light:border-slate-300 bg-slate-800/50 light:bg-white px-3 py-2 text-sm text-slate-300 light:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/50 transition-all"
                >
                  <option value="">Todos los estados</option>
                  <option value="ACTIVE">Solo activas</option>
                  <option value="INACTIVE">Solo inactivas</option>
                </select>
              </div>
            </>
          )}

          <div className="p-2">
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <OrbSpinner size={64} state="working" speed={1.25} />
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/50 light:bg-slate-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-slate-500">
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">
                  {searchInput || statusFilter ? 'Sin resultados' : 'No hay sucursales'}
                </p>
                {!searchInput && !statusFilter && canWrite && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="mt-2 text-sm font-medium text-white light:text-black hover:underline"
                  >
                    Crear la primera
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredBranches.map((branch) => {
                  const isActive = branch.id === selectedBranchId;
                  return (
                    <button
                      key={branch.id}
                      onClick={() => { setSelectedBranchId(branch.id); setIsCreating(false); }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? 'bg-white/10 light:bg-black/5 text-white light:text-slate-900'
                          : 'text-slate-400 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-50 hover:text-slate-200 light:hover:text-slate-800'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isActive ? 'bg-white text-black' : 'bg-slate-800/80 light:bg-slate-200 text-slate-300 light:text-slate-600'
                      }`}>
                        {branch.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{branch.name}</p>
                          {branch.isMain && (
                            <span className="shrink-0 rounded-md bg-white/10 light:bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400 light:text-slate-500">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500 light:text-slate-400">{branch.code}</p>
                      </div>
                      <div className={`h-2 w-2 shrink-0 rounded-full ${
                        branch.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'
                      }`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario o cards (sin contenedor) ── */}
      <div className="flex-1">
        {isCreating ? (
          /* ── Formulario de creación ── */
          <div className="mx-auto max-w-md">
            <div className="mb-6">
              <button
                onClick={() => setIsCreating(false)}
                className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Volver
              </button>
              <h2 className="text-xl font-semibold text-white light:text-slate-900">Nueva sucursal</h2>
            </div>
            <BranchForm onSuccess={() => setIsCreating(false)} />
          </div>
        ) : showEditForm ? (
          /* ── Formulario de edición ── */
          <div className="mx-auto max-w-2xl">
            <div className="mb-6">
              <button
                onClick={() => setSelectedBranchId(null)}
                className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Volver
              </button>
              <h2 className="text-xl font-semibold text-white light:text-slate-900">Editar sucursal</h2>
            </div>
            <BranchForm
              branchId={selectedBranchId ?? undefined}
              initialData={selectedBranch ? {
                name: selectedBranch.name,
                code: selectedBranch.code,
                address: selectedBranch.address ?? '',
                phone: selectedBranch.phone ?? '',
                isMain: selectedBranch.isMain,
              } : undefined}
              onSuccess={() => setSelectedBranchId(null)}
            />
          </div>
        ) : (
          /* ── Vista de cards ── */
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white light:text-slate-900">Todas las sucursales</h2>
              <p className="text-sm text-slate-500 light:text-slate-400">Selecciona una sucursal para editar</p>
            </div>

            {branches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50 light:bg-slate-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-slate-500">
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-slate-400 light:text-slate-500">Sin sucursales</p>
                <p className="mt-1 text-sm text-slate-600 light:text-slate-400">Crea tu primera sucursal para comenzar</p>
                {canWrite && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="mt-4 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg shadow-white/10 transition-all hover:bg-white/90 active:scale-[0.97] light:bg-black light:text-white light:shadow-black/10 light:hover:bg-black/90"
                  >
                    + Nueva sucursal
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="group relative rounded-xl border border-slate-800/60 light:border-slate-200 bg-slate-800/30 light:bg-slate-50 p-5 transition-all hover:border-slate-700 light:hover:border-slate-300 hover:bg-slate-800/50 light:hover:bg-white cursor-pointer"
                    onClick={() => setSelectedBranchId(branch.id)}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/50 light:bg-slate-200 text-sm font-bold text-white light:text-slate-700">
                          {branch.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white light:text-slate-900">{branch.name}</p>
                          <p className="text-xs text-slate-500 light:text-slate-400 font-mono">{branch.code}</p>
                        </div>
                      </div>
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        branch.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-600'
                      }`} />
                    </div>

                    <div className="mb-4 flex gap-4 text-xs text-slate-500 light:text-slate-400">
                      <span>{branch.productsCount ?? 0} productos</span>
                      <span>{branch.tablesCount ?? 0} mesas</span>
                      <span>{branch.activeOrdersCount ?? 0} órdenes</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {branch.isMain && (
                        <span className="rounded-lg bg-white/10 light:bg-black/5 px-2 py-1 text-xs font-medium text-slate-300 light:text-slate-600">
                          Principal
                        </span>
                      )}
                      <span className={`rounded-lg px-2 py-1 text-xs font-medium ${
                        branch.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 light:bg-emerald-50 light:text-emerald-600'
                          : 'bg-slate-700/50 light:bg-slate-200 text-slate-400 light:text-slate-500'
                      }`}>
                        {branch.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {canWrite && (
                      <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {branch.status === 'ACTIVE' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionError(null); setBranchToDeactivate(branch); }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Desactivar"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                              <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                              <line x1="12" y1="2" x2="12" y2="12" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionError(null); setBranchToReactivate(branch); }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                            title="Reactivar"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog desactivar */}
      <ConfirmDialog
        open={branchToDeactivate !== null}
        title="Desactivar sucursal"
        message={
          <div>
            <p>¿Desactivar <strong>{branchToDeactivate?.name}</strong>?</p>
            <p className="mt-2 text-xs text-slate-500">
              La sucursal quedará inactiva. No se podrá desactivar si tiene órdenes en progreso,
              cajas abiertas, turnos abiertos o estaciones POS activas.
            </p>
            {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
          </div>
        }
        confirmText="Desactivar"
        isLoading={deactivateMutation.isPending}
        onCancel={() => { setBranchToDeactivate(null); setActionError(null); }}
        onConfirm={() => { if (branchToDeactivate) deactivateMutation.mutate(branchToDeactivate.id); }}
      />

      {/* Dialog reactivar */}
      <ConfirmDialog
        open={branchToReactivate !== null}
        title="Reactivar sucursal"
        message={
          <div>
            <p>¿Reactivar <strong>{branchToReactivate?.name}</strong>?</p>
            {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
          </div>
        }
        confirmText="Reactivar"
        isLoading={reactivateMutation.isPending}
        onCancel={() => { setBranchToReactivate(null); setActionError(null); }}
        onConfirm={() => { if (branchToReactivate) reactivateMutation.mutate(branchToReactivate.id); }}
      />
    </div>
  );
}
