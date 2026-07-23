import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createSaaSUserSchema,
  type CreateSaaSUserInput,
} from '@saas/shared';
import { adminApi } from '~/lib';
import { RoutePending, Skeleton } from '~/components';
import { Pagination } from '~/components/ui';
import { sileo } from 'sileo';

export const Route = createFileRoute('/_authed/saas-users')({
  component: SaaSUsersPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 20;

function SaaSUsersPage(): ReactNode {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'saas-users', page],
    queryFn: () => adminApi.listSaaSUsers(page, PAGE_SIZE),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm<CreateSaaSUserInput>({
    resolver: zodResolver(createSaaSUserSchema) as unknown as Resolver<CreateSaaSUserInput>,
    defaultValues: { email: '', password: '', role: 'SUPER_ADMIN' },
  });

  const createMutation = useMutation({
    mutationFn: (d: { email: string; password: string; role: string }) =>
      adminApi.createSaaSUser(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'saas-users'] });
      setShowForm(false);
      reset();
      sileo.success({ title: 'Administrador creado correctamente' });
    },
    onError: (err: Error) => {
      setError('root', { message: err.message });
      sileo.error({ title: err.message });
    },
  });

  const onCreate = (data: CreateSaaSUserInput) => {
    createMutation.mutate(data);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios Administradores</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo admin'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">Crear Super Administrador</h2>
          <form onSubmit={handleSubmit(onCreate)} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-64 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                placeholder="admin@ejemplo.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Contraseña</label>
              <input
                type="password"
                {...register('password')}
                className="w-48 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                placeholder="Mín. 8 caracteres"
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </button>
          </form>
          {errors.root && <p className="mt-2 text-sm text-red-400">{errors.root.message}</p>}
        </div>
      )}

      <Skeleton name="saas-users-table" loading={isLoading}>
        {data && (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.data.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                        No hay administradores registrados.
                      </td>
                    </tr>
                  )}
                  {data.data.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-purple-800 bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-400">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
                          u.isActive
                            ? 'border-green-800 bg-green-900/30 text-green-400'
                            : 'border-zinc-700 text-zinc-500'
                        }`}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Skeleton>
    </div>
  );
}
