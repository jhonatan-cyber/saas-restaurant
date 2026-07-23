import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { RoutePending } from '~/components';
import { usersApi, ApiClientError, branchesApi, type Branch } from '~/lib/api';
import { Role, ROLE_LABELS, SaaSRole } from '@saas/shared';

export const Route = createFileRoute('/_authed/users/new')({
  component: UserNewPage,
  pendingComponent: RoutePending,
});

function UserNewPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(Role.CAJERO);
  const [defaultBranchId, setDefaultBranchId] = useState('');
  const [assignedBranchIds, setAssignedBranchIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const branchesQuery = useQuery({
    queryKey: ['branches', { pageSize: 100 }],
    queryFn: () => branchesApi.list({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof usersApi.create>[0]) => usersApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void navigate({ to: '/users' });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al crear usuario';
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      email,
      fullName,
      phone: phone || undefined,
      password,
      role,
      defaultBranchId: defaultBranchId || undefined,
      branchIds: assignedBranchIds.length > 0 ? assignedBranchIds : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nuevo usuario</h1>
        <p className="text-sm text-slate-500 mt-1">
          Crea un nuevo usuario para que opere en el negocio
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="label" htmlFor="fullName">
              Nombre completo *
            </label>
            <input
              id="fullName"
              className="input"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="email">
              Email *
            </label>
            <input
              id="email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="phone">
              Teléfono
            </label>
            <input
              id="phone"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="role">
              Rol *
            </label>
            <select
              id="role"
              className="input"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {Object.entries(ROLE_LABELS)
                .filter(([key]) => key !== SaaSRole.SUPER_ADMIN)
                .map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="defaultBranchId">
              Sucursal por defecto
            </label>
            <select
              id="defaultBranchId"
              className="input"
              value={defaultBranchId}
              onChange={(e) => setDefaultBranchId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {branchesQuery.data?.data.map((b: Branch) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="password">
              Contraseña *
            </label>
            <input
              id="password"
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Asignación de sucursales */}
        <div>
          <label className="label">Sucursales asignadas</label>
          <p className="text-xs text-slate-500 mb-2">
            Seleccioná las sucursales a las que este usuario tendrá acceso. Si no seleccionás ninguna, tendrá acceso a todas.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(branchesQuery.data?.data ?? []).map((b: Branch) => {
              const checked = assignedBranchIds.includes(b.id);
              return (
                <label
                  key={b.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    checked
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    checked={checked}
                    onChange={() => {
                      setAssignedBranchIds(
                        checked
                          ? assignedBranchIds.filter((id) => id !== b.id)
                          : [...assignedBranchIds, b.id],
                      );
                    }}
                  />
                  {b.name}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void navigate({ to: '/users' })}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </div>
  );
}
