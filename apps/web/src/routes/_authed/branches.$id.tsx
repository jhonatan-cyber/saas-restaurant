import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { branchesApi, ApiClientError } from '../../lib/api';
import { branchFormSchema, type BranchFormValues } from '../../lib/schemas';
import { FormField } from '../../components/form-field';
import { SubmitButton } from '../../components/submit-button';

export const Route = createFileRoute('/_authed/branches/$id')({
  component: EditBranchPage,
});

function EditBranchPage(): ReactNode {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const branchQuery = useQuery({
    queryKey: ['branches', id],
    queryFn: () => branchesApi.get(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      phone: '',
      isMain: false,
    },
  });

  useEffect(() => {
    if (branchQuery.data) {
      const b = branchQuery.data;
      reset({
        name: b.name,
        code: b.code,
        address: b.address ?? '',
        phone: b.phone ?? '',
        isMain: b.isMain,
      });
    }
  }, [branchQuery.data, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: BranchFormValues) => {
      const payload = {
        name: data.name,
        code: data.code,
        address: data.address || undefined,
        phone: data.phone || undefined,
        isMain: data.isMain,
      };
      return branchesApi.update(id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      void navigate({ to: '/branches' });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiClientError ? err.message : 'Error al actualizar la sucursal',
      );
    },
  });

  const onSubmit = (values: BranchFormValues): void => {
    setServerError(null);
    updateMutation.mutate(values);
  };

  if (branchQuery.isLoading) {
    return <p className="text-slate-500">Cargando…</p>;
  }
  if (branchQuery.error) {
    return (
      <p className="text-red-600">Error al cargar la sucursal: {String(branchQuery.error)}</p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/branches" className="text-sm text-slate-500 hover:text-slate-700">
          ← Sucursales
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar sucursal</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <input id="name" className="input" {...register('name')} />
        </FormField>

        <FormField
          label="Código"
          htmlFor="code"
          required
          hint="Identificador corto único."
          error={errors.code?.message}
        >
          <input id="code" className="input uppercase" {...register('code')} />
        </FormField>

        <FormField label="Dirección" htmlFor="address" error={errors.address?.message}>
          <input id="address" className="input" {...register('address')} />
        </FormField>

        <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" className="input" {...register('phone')} />
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isMain')} className="rounded" />
          <span className="text-slate-700">Sucursal principal</span>
        </label>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/branches" className="btn-secondary">
            Cancelar
          </Link>
          <SubmitButton isSubmitting={isSubmitting || updateMutation.isPending}>
            Guardar cambios
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
