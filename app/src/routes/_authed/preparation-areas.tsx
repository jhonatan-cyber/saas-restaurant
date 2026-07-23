import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  preparationAreasApi,
  type PreparationArea,
  type PreparationAreaFilters,
} from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog, RoutePending, StatusBadge } from '~/components';

export const Route = createFileRoute('/_authed/preparation-areas')({
  component: PrepAreasListPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

function PrepAreasListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<PreparationAreaFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [areaToDelete, setAreaToDelete] = useState<PreparationArea | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['preparation-areas', filters],
    queryFn: () => preparationAreasApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => preparationAreasApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['preparation-areas'] });
      setAreaToDelete(null);
      setDeleteError(null);
    },
    onError: handleMutationError(setDeleteError, { fallback: 'Error al eliminar' }),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; displayOrder: number }[]) =>
      preparationAreasApi.reorder(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['preparation-areas'] });
    },
  });

  const moveItem = (area: PreparationArea, direction: -1 | 1): void => {
    const list = listQuery.data?.data ?? [];
    const currentIndex = list.findIndex((a) => a.id === area.id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const next = [...list];
    const tmp = next[currentIndex];
    if (!tmp) return;
    next[currentIndex] = next[targetIndex]!;
    next[targetIndex] = tmp;

    void reorderMutation.mutateAsync(
      next.map((a, idx) => ({ id: a.id, displayOrder: idx })),
    );
  };

  const canWrite = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Áreas de preparación</h1>
          <p className="text-sm text-slate-500 mt-1">
            Estaciones de trabajo: cocina, bar, cafetería, etc.
          </p>
        </div>
        {canWrite && (
          <Link to="/preparation-areas/new" className="btn-primary">
            + Nueva área
          </Link>
        )}
      </div>

      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando…</div>
        ) : listQuery.error ? (
          <div className="p-8 text-center text-red-600">
            Error: {String(listQuery.error)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {listQuery.data?.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No hay áreas. Crea la primera.
                    </td>
                  </tr>
                )}
                {listQuery.data?.data.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex items-center gap-1">
                        <span>{a.displayOrder}</span>
                        {canWrite && (
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => moveItem(a, -1)}
                              className="text-xs text-slate-400 hover:text-slate-700"
                              aria-label="Subir"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(a, 1)}
                              className="text-xs text-slate-400 hover:text-slate-700"
                              aria-label="Bajar"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{a.name}</p>
                      {a.description && (
                        <p className="text-xs text-slate-500">{a.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {a.code}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={a.isActive ? 'Activa' : 'Inactiva'}
                        variant={a.isActive ? 'success' : 'neutral'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && (
                          <>
                            <Link
                              to="/preparation-areas/$id"
                              params={{ id: a.id }}
                              className="text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                              Editar
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setAreaToDelete(a);
                              }}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={areaToDelete !== null}
        title="Eliminar área"
        message={
          <div>
            <p>
              ¿Eliminar <strong>{areaToDelete?.name}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Si hay productos que la usan, la operación fallará.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          </div>
        }
        confirmText="Eliminar"
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          setAreaToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (areaToDelete) deleteMutation.mutate(areaToDelete.id);
        }}
      />
    </div>
  );
}
