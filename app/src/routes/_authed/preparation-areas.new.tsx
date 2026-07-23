import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { preparationAreasApi, ApiClientError } from '~/lib/api';
import {
  preparationAreaFormSchema,
  type PreparationAreaFormValues,
} from '~/lib/schemas';
import { FormField, RoutePending, TextareaField, SubmitButton } from '~/components';
import { useAuthStore } from '~/lib/auth-store';

export const Route = createFileRoute('/_authed/preparation-areas/new')({
  component: NewPrepAreaPage,
  pendingComponent: RoutePending,
});

function NewPrepAreaPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ['auth', 'branches'],
    queryFn: async () => user?.branches ?? [],
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PreparationAreaFormValues>({
    resolver: zodResolver(preparationAreaFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      branchId: '',
      displayOrder: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PreparationAreaFormValues) => {
      const payload = {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        branchId: data.branchId || undefined,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      };
      return preparationAreasApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['preparation-areas'] });
      void navigate({ to: '/preparation-areas' });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiClientError ? err.message : 'Error al crear el área',
      );
    },
  });

  const onSubmit = (values: PreparationAreaFormValues): void => {
    setServerError(null);
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/preparation-areas" className="text-sm text-slate-500 hover:text-slate-700">
          ← Áreas de preparación
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nueva área</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
            <input id="name" className="input" placeholder="Cocina" {...register('name')} />
          </FormField>
          <FormField
            label="Código"
            htmlFor="code"
            required
            hint="Mayúsculas, números y guion bajo. Ej: KITCHEN"
            error={errors.code?.message}
          >
            <input id="code" className="input" placeholder="KITCHEN" {...register('code')} />
          </FormField>
        </div>

        <TextareaField
          label="Descripción"
          htmlFor="description"
          error={errors.description?.message}
          value={watch('description') ?? ''}
          onChange={(v) => setValue('description', v, { shouldValidate: true })}
          rows={2}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Orden" htmlFor="displayOrder" error={errors.displayOrder?.message}>
            <input
              id="displayOrder"
              className="input"
              type="number"
              min={0}
              {...register('displayOrder', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Sucursal" htmlFor="branchId">
            <select id="branchId" className="input" {...register('branchId')}>
              <option value="">Aplica a todo el business</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} className="rounded" />
          <span className="text-slate-700">Área activa</span>
        </label>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/preparation-areas" className="btn-secondary">
            Cancelar
          </Link>
          <SubmitButton isSubmitting={isSubmitting || createMutation.isPending}>
            Crear área
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
