import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { branchesApi, ApiClientError } from '~/lib/api';
import { branchFormSchema, type BranchFormValues } from '~/lib/schemas';
import { FormField } from '~/components/form-field';
import { SubmitButton } from '~/components/submit-button';

export const Route = createFileRoute('/_authed/branches/new')({
  component: NewBranchPage,
});

function NewBranchPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
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

  const createMutation = useMutation({
    mutationFn: (data: BranchFormValues) => {
      const payload = {
        name: data.name,
        code: data.code,
        address: data.address || undefined,
        phone: data.phone || undefined,
        isMain: data.isMain,
      };
      return branchesApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      void navigate({ to: '/branches' });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiClientError ? err.message : 'Error al crear la sucursal',
      );
    },
  });

  const onSubmit = (values: BranchFormValues): void => {
    setServerError(null);
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/branches" className="text-sm text-slate-500 hover:text-slate-700">
          ← Sucursales
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nueva sucursal</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <input
            id="name"
            className="input"
            placeholder="Sucursal Central"
            {...register('name')}
          />
        </FormField>

        <FormField
          label="Código"
          htmlFor="code"
          required
          hint="Identificador corto único. Solo mayúsculas, números y guiones."
          error={errors.code?.message}
        >
          <input
            id="code"
            className="input uppercase"
            placeholder="CEN"
            {...register('code')}
          />
        </FormField>

        <FormField label="Dirección" htmlFor="address" error={errors.address?.message}>
          <input
            id="address"
            className="input"
            placeholder="Av. Principal #123"
            {...register('address')}
          />
        </FormField>

        <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
          <input
            id="phone"
            className="input"
            placeholder="+591 71234567"
            {...register('phone')}
          />
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
          <SubmitButton isSubmitting={isSubmitting || createMutation.isPending}>
            Crear sucursal
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
