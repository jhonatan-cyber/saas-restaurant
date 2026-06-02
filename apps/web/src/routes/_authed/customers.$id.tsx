import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { customersApi, ApiClientError } from '../../../lib/api';
import { customerFormSchema, type CustomerFormValues } from '../../../lib/schemas';
import { FormField } from '../../../components/form-field';
import { TextareaField } from '../../../components/textarea-field';
import { SubmitButton } from '../../../components/submit-button';

export const Route = createFileRoute('/_authed/customers/$id')({
  component: EditCustomerPage,
});

function EditCustomerPage(): ReactNode {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const customerQuery = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.get(id),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
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

  useEffect(() => {
    if (customerQuery.data) {
      const c = customerQuery.data;
      reset({
        name: c.name,
        taxId: c.taxId ?? '',
        taxIdType: c.taxIdType ?? 'NIT',
        email: c.email ?? '',
        phone: c.phone ?? '',
        address: c.address ?? '',
        addressReference: c.addressReference ?? '',
        latitude: c.latitude ? Number(c.latitude) : undefined,
        longitude: c.longitude ? Number(c.longitude) : undefined,
        notes: c.notes ?? '',
        isActive: c.isActive,
      });
    }
  }, [customerQuery.data, reset]);

  const updateMutation = useMutation({
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
      return customersApi.update(id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void navigate({ to: '/customers' });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiClientError ? err.message : 'Error al actualizar el cliente',
      );
    },
  });

  const onSubmit = (values: CustomerFormValues): void => {
    setServerError(null);
    updateMutation.mutate(values);
  };

  if (customerQuery.isLoading) {
    return <p className="text-slate-500">Cargando…</p>;
  }
  if (customerQuery.error) {
    return <p className="text-red-600">Error: {String(customerQuery.error)}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/customers" className="text-sm text-slate-500 hover:text-slate-700">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar cliente</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <input id="name" className="input" {...register('name')} />
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
            <input id="taxId" className="input" {...register('taxId')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <input id="email" className="input" type="email" {...register('email')} />
          </FormField>
          <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
            <input id="phone" className="input" {...register('phone')} />
          </FormField>
        </div>

        <FormField label="Dirección" htmlFor="address" error={errors.address?.message}>
          <input id="address" className="input" {...register('address')} />
        </FormField>

        <FormField label="Referencia" htmlFor="addressReference" error={errors.addressReference?.message}>
          <input id="addressReference" className="input" {...register('addressReference')} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Latitud" htmlFor="latitude" error={errors.latitude?.message}>
            <input
              id="latitude"
              className="input"
              type="number"
              step="0.0000001"
              {...register('latitude', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Longitud" htmlFor="longitude" error={errors.longitude?.message}>
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
          <SubmitButton isSubmitting={isSubmitting || updateMutation.isPending}>
            Guardar cambios
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
