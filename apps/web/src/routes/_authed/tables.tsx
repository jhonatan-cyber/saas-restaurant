import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import {
  tablesApi,
  ApiClientError,
  type RestaurantTable,
  type TableFilters,
} from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog } from '~/components/confirm-dialog';
import {
  TABLE_STATUS_LABELS,
  TABLE_LOCATION_LABELS,
  type TableStatus,
} from '@saas/shared';

export const Route = createFileRoute('/_authed/tables')({
  component: TablesListPage,
});

const PAGE_SIZE = 20;

function TablesListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [filters, setFilters] = useState<TableFilters>({
    status: undefined,
    location: undefined,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [tableToDelete, setTableToDelete] = useState<RestaurantTable | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['tables', filters],
    queryFn: () => tablesApi.list(filters),
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      tablesApi.changeStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
      setTableToDelete(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      setDeleteError(
        err instanceof ApiClientError ? err.message : 'Error al eliminar',
      );
    },
  });

  const canWrite = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mesas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Salón y reservas. La mesa por defecto es la sucursal principal.
          </p>
        </div>
        {canWrite && (
          <Link to="/tables/new" className="btn-primary">
            + Nueva mesa
          </Link>
        )}
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="input"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value === '' ? undefined : (e.target.value as TableStatus),
                page: 1,
              }))
            }
          >
            <option value="">Todos los estados</option>
            {(Object.keys(TABLE_STATUS_LABELS) as TableStatus[]).map((s) => (
              <option key={s} value={s}>
                {TABLE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.location ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                location: e.target.value === '' ? undefined : (e.target.value as TableFilters['location']),
                page: 1,
              }))
            }
          >
            <option value="">Todas las ubicaciones</option>
            {Object.entries(TABLE_LOCATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando…</div>
        ) : listQuery.error ? (
          <div className="p-8 text-center text-red-600">Error: {String(listQuery.error)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mesa</th>
                  <th className="px-4 py-3">Capacidad</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {listQuery.data?.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No hay mesas.
                    </td>
                  </tr>
                )}
                {listQuery.data?.data.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">Mesa {t.number}</p>
                      {t.notes && <p className="text-xs text-slate-500">{t.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.capacity} pers.
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {TABLE_LOCATION_LABELS[t.location]}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="text-xs rounded-full px-2 py-1 border-0 font-medium"
                        value={t.status}
                        onChange={(e) =>
                          changeStatusMutation.mutate({
                            id: t.id,
                            status: e.target.value as TableStatus,
                          })
                        }
                        style={{
                          backgroundColor:
                            t.status === 'FREE'
                              ? '#dcfce7'
                              : t.status === 'OCCUPIED'
                                ? '#fee2e2'
                                : '#fef9c3',
                          color:
                            t.status === 'FREE'
                              ? '#166534'
                              : t.status === 'OCCUPIED'
                                ? '#991b1b'
                                : '#854d0e',
                        }}
                      >
                        {(Object.keys(TABLE_STATUS_LABELS) as TableStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {TABLE_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && (
                          <>
                            <Link
                              to="/tables/$id"
                              params={{ id: t.id }}
                              className="text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                              Editar
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setTableToDelete(t);
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
        open={tableToDelete !== null}
        title="Eliminar mesa"
        message={
          <div>
            <p>
              ¿Eliminar la <strong>Mesa {tableToDelete?.number}</strong>?
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          </div>
        }
        confirmText="Eliminar"
        isLoading={deleteMutation.isPending}
        onCancel={() => {
          setTableToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (tableToDelete) deleteMutation.mutate(tableToDelete.id);
        }}
      />
    </div>
  );
}
