import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { tablesApi, ApiClientError } from '~/lib/api';
import { tableFormSchema, type TableFormValues } from '~/lib/schemas';
import { FormField, RoutePending, SelectField, SubmitButton, TextareaField } from '~/components';
import { useAuthStore } from '~/lib/auth-store';
import { useBranchStore } from '~/lib/branch-store';
import { TABLE_LOCATION_LABELS, type TableLocation } from '@saas/shared';

export const Route = createFileRoute('/_authed/tables/new')({
  component: NewTablePage,
  pendingComponent: RoutePending,
});

function NewTablePage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
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
  } = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      branchId: activeBranchId ?? branches[0]?.id ?? '',
      number: '',
      capacity: 4,
      location: 'INDOOR',
      displayOrder: 0,
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TableFormValues) => {
      const payload = {
        branchId: data.branchId,
        number: data.number,
        capacity: data.capacity,
        location: data.location,
        displayOrder: data.displayOrder,
        notes: data.notes,
        posX: data.posX,
        posY: data.posY,
      };
      return tablesApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tables'] });
      void navigate({ to: '/tables' });
    },
    onError: (err: unknown) => {
      setServerError(err instanceof ApiClientError ? err.message : 'Error al crear la mesa');
    },
  });

  const onSubmit = (values: TableFormValues): void => {
    setServerError(null);
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/tables" className="text-sm text-slate-500 hover:text-slate-700">
          ← Mesas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nueva mesa</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Número / nombre" htmlFor="number" required error={errors.number?.message}>
            <input id="number" className="input" placeholder="M1" {...register('number')} />
          </FormField>
          <FormField label="Sucursal" htmlFor="branchId" required error={errors.branchId?.message}>
            <select id="branchId" className="input" {...register('branchId')}>
              <option value="">Seleccionar…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Capacidad" htmlFor="capacity" required error={errors.capacity?.message}>
            <input
              id="capacity"
              className="input"
              type="number"
              min={1}
              max={50}
              {...register('capacity', { valueAsNumber: true })}
            />
          </FormField>
          <SelectField
            label="Ubicación"
            htmlFor="location"
            value={watch('location')}
            onChange={(v) => setValue('location', v as TableLocation, { shouldValidate: true })}
            options={(Object.keys(TABLE_LOCATION_LABELS) as TableLocation[]).map((l) => ({
              value: l,
              label: TABLE_LOCATION_LABELS[l],
            }))}
          />
        </div>

        <TextareaField
          label="Notas"
          htmlFor="notes"
          error={errors.notes?.message}
          value={watch('notes') ?? ''}
          onChange={(v) => setValue('notes', v, { shouldValidate: true })}
          rows={2}
          placeholder="Mesa cerca de la ventana, trona disponible, etc."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField label="Orden" htmlFor="displayOrder" error={errors.displayOrder?.message}>
            <input
              id="displayOrder"
              className="input"
              type="number"
              min={0}
              {...register('displayOrder', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Pos X (floor plan)"
            htmlFor="posX"
            error={errors.posX?.message}
          >
            <input
              id="posX"
              className="input"
              type="number"
              min={0}
              {...register('posX', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Pos Y (floor plan)"
            htmlFor="posY"
            error={errors.posY?.message}
          >
            <input
              id="posY"
              className="input"
              type="number"
              min={0}
              {...register('posY', { valueAsNumber: true })}
            />
          </FormField>
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/tables" className="btn-secondary">
            Cancelar
          </Link>
          <SubmitButton isSubmitting={isSubmitting || createMutation.isPending}>
            Crear mesa
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
