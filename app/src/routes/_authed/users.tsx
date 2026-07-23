import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { usersApi, ApiClientError, type UserFilters } from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { useAuthStore } from '~/lib/auth-store';
import { ConfirmDialog, RoutePending, StatusBadge } from '~/components';
import { Role, ROLE_LABELS } from '@saas/shared';

const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PENDING: 'Pendiente',
};

export const Route = createFileRoute('/_authed/users')({
  component: UsersListPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  status: string;
  defaultBranchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function UsersListPage(): ReactNode {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: undefined,
    status: undefined,
    page: 1,
    pageSize: PAGE_SIZE,
  });
  const [searchInput, setSearchInput] = useState('');
  const [userToDeactivate, setUserToDeactivate] = useState<UserListItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersApi.list(filters),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserToDeactivate(null);
      setActionError(null);
    },
    onError: handleMutationError(setActionError, { fallback: 'Error al desactivar' }),
  });

  const handleSearch = (): void => {
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const canWrite = user?.role === Role.OWNER || user?.role === Role.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los usuarios que operan en tu negocio
          </p>
        </div>
        {canWrite && (
          <Link to="/users/new" className="btn-primary">
            + Nuevo usuario
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre o email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
            <button className="btn-secondary" onClick={handleSearch}>
              Buscar
            </button>
          </div>

          <select
            className="input"
            value={filters.role ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, role: e.target.value || undefined, page: 1 }))
            }
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            className="input"
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))
            }
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="INVITED">Invitado</option>
          </select>
        </div>
      </div>

      {/* Error de acción */}
      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando...</div>
        ) : listQuery.isError ? (
          <div className="p-8 text-center text-red-500">
            Error al cargar usuarios:{' '}
            {listQuery.error instanceof ApiClientError
              ? listQuery.error.message
              : 'Error desconocido'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Último acceso
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listQuery.data?.data.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{u.fullName}</div>
                      {u.phone && (
                        <div className="text-xs text-slate-400">{u.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={USER_STATUS_LABELS[u.status as keyof typeof USER_STATUS_LABELS] ?? u.status}
                        variant={u.status === 'ACTIVE' ? 'success' : 'warning'}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString('es-AR')
                        : 'Nunca'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to="/users/$id"
                          params={{ id: u.id }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Editar
                        </Link>
                        {canWrite && u.status === 'ACTIVE' && (
                          <button
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                            onClick={() => setUserToDeactivate(u)}
                          >
                            Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {listQuery.data?.meta && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-sm text-slate-500">
              Página {listQuery.data.meta.page} de {listQuery.data.meta.totalPages} ({listQuery.data.meta.total} usuarios)
            </div>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-sm"
                disabled={listQuery.data.meta.page <= 1}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: f.page! - 1 }))
                }
              >
                Anterior
              </button>
              <button
                className="btn-secondary text-sm"
                disabled={listQuery.data.meta.page >= listQuery.data.meta.totalPages}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: f.page! + 1 }))
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm desactivar */}
      <ConfirmDialog
        open={userToDeactivate !== null}
        title="Desactivar usuario"
        message={
          userToDeactivate
            ? `¿Estás seguro de desactivar a "${userToDeactivate.fullName}"? No podrá iniciar sesión.`
            : ''
        }
        confirmText="Desactivar"
        isLoading={deactivateMutation.isPending}
        onConfirm={() => {
          if (userToDeactivate) deactivateMutation.mutate(userToDeactivate.id);
        }}
        onCancel={() => {
          setUserToDeactivate(null);
          setActionError(null);
        }}
      />
    </div>
  );
}
