import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { customersApi } from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { customerFormSchema, type CustomerFormValues } from '~/lib/schemas';
import { FormField, RoutePending, TextareaField, SubmitButton } from '~/components';

export const Route = createFileRoute('/_authed/customers/new')({
  component: NewCustomerPage,
  pendingComponent: RoutePending,
});

function NewCustomerPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      taxId: '',
      taxIdType: 'NIT',
      email: '',
      phone: '',
      address: '',
      addressReference: '',
      notes: '',
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormValues) => {
      const payload = {
        name: data.name,
        taxId: data.taxId,
        taxIdType: data.taxIdType,
        email: data.email,
        phone: data.phone,
        address: data.address,
        addressReference: data.addressReference,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        isActive: data.isActive,
      };
      return customersApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void navigate({ to: '/customers' });
    },
    onError: handleMutationError(setServerError, { fallback: 'Error al crear el cliente' }),
  });

  const onSubmit = (values: CustomerFormValues): void => {
    setServerError(null);
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/customers" className="text-sm text-slate-500 hover:text-slate-700">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nuevo cliente</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <input id="name" className="input" placeholder="Juan Pérez" {...register('name')} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Tipo de identificación" htmlFor="taxIdType" error={errors.taxIdType?.message}>
            <select id="taxIdType" className="input" {...register('taxIdType')}>
              <option value="NIT">NIT</option>
              <option value="CI">CI</option>
              <option value="RFC">RFC</option>
              <option value="CF">Consumidor Final</option>
              <option value="PAS">Pasaporte</option>
              <option value="OTHER">Otro</option>
            </select>
          </FormField>
          <FormField label="Número" htmlFor="taxId" error={errors.taxId?.message}>
            <input id="taxId" className="input" placeholder="1234567" {...register('taxId')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="cliente@ejemplo.com"
              {...register('email')}
            />
          </FormField>
          <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
            <input id="phone" className="input" placeholder="+591 70123456" {...register('phone')} />
          </FormField>
        </div>

        <FormField label="Dirección" htmlFor="address" error={errors.address?.message}>
          <input
            id="address"
            className="input"
            placeholder="Av. Principal #123, La Paz"
            {...register('address')}
          />
        </FormField>

        <FormField
          label="Referencia"
          htmlFor="addressReference"
          hint="Edificio, piso, apartamento…"
          error={errors.addressReference?.message}
        >
          <input
            id="addressReference"
            className="input"
            placeholder="Edificio X, Piso 5, Apto 502"
            {...register('addressReference')}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Latitud"
            htmlFor="latitude"
            hint="Para delivery. Placeholder: integración con mapa en fase futura."
            error={errors.latitude?.message}
          >
            <input
              id="latitude"
              className="input"
              type="number"
              step="0.0000001"
              {...register('latitude', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Longitud"
            htmlFor="longitude"
            error={errors.longitude?.message}
          >
            <input
              id="longitude"
              className="input"
              type="number"
              step="0.0000001"
              {...register('longitude', { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <TextareaField
          label="Notas"
          htmlFor="notes"
          error={errors.notes?.message}
          value={watch('notes') ?? ''}
          onChange={(v) => setValue('notes', v, { shouldValidate: true })}
          rows={3}
          placeholder="Alergias, preferencias, datos de contacto adicionales…"
        />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} className="rounded" />
          <span className="text-slate-700">Cliente activo</span>
        </label>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/customers" className="btn-secondary">
            Cancelar
          </Link>
          <SubmitButton isSubmitting={isSubmitting || createMutation.isPending}>
            Crear cliente
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
