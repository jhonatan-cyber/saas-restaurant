import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoutePending, FormField, SubmitButton } from '~/components';
import { businessApi, ApiClientError } from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { businessFormSchema, type BusinessFormValues, businessFormDefaults } from '~/lib/schemas';
import { SUBSCRIPTION_STATUS_LABELS } from '@saas/shared';

export const Route = createFileRoute('/_authed/business')({
  component: BusinessSettingsPage,
  pendingComponent: RoutePending,
});

const TIMEZONES = [
  'America/La_Paz',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/Panama',
  'America/Caracas',
  'America/Havana',
  'America/Santo_Domingo',
  'America/Asuncion',
  'America/Montevideo',
  'America/Sao_Paulo',
  'UTC',
];

const CURRENCIES = [
  { code: 'BOB', name: 'Boliviano (Bs)' },
  { code: 'ARS', name: 'Peso Argentino ($)' },
  { code: 'CLP', name: 'Peso Chileno ($)' },
  { code: 'COP', name: 'Peso Colombiano ($)' },
  { code: 'USD', name: 'Dólar Estadounidense (US$)' },
  { code: 'MXN', name: 'Peso Mexicano ($)' },
  { code: 'PEN', name: 'Sol Peruano (S/)' },
  { code: 'UYU', name: 'Peso Uruguayo ($)' },
  { code: 'VES', name: 'Bolívar (Bs.S)' },
];

function BusinessSettingsPage(): ReactNode {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: businessFormDefaults,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  const settingsQuery = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => businessApi.getSettings(),
  });

  /* Reset form when data loads */
  useEffect(() => {
    if (settingsQuery.data) {
      reset({
        name: settingsQuery.data.name,
        legalName: settingsQuery.data.legalName ?? undefined,
        taxId: settingsQuery.data.taxId ?? undefined,
        email: settingsQuery.data.email,
        phone: settingsQuery.data.phone ?? undefined,
        currency: settingsQuery.data.currency,
        timezone: settingsQuery.data.timezone,
        moduleReports: settingsQuery.data.moduleReports,
        moduleInventory: settingsQuery.data.moduleInventory,
        modulePosStations: settingsQuery.data.modulePosStations,
        moduleDeliveryApp: settingsQuery.data.moduleDeliveryApp,
      });
    }
  }, [settingsQuery.data, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: BusinessFormValues) => businessApi.updateSettings(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      setSuccess('Configuración guardada correctamente');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: handleMutationError(
      (msg) => { form.setError('root', { message: msg }); },
      { fallback: 'Error al guardar' },
    ),
  });

  const onSubmit = (data: BusinessFormValues): void => {
    setSuccess(null);
    updateMutation.mutate(data);
  };

  const rootError = form.formState.errors.root?.message;

  if (settingsQuery.isLoading) {
    return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;
  }

  if (settingsQuery.isError) {
    return (
      <div className="p-8 text-center text-red-500">
        Error al cargar configuración:{' '}
        {settingsQuery.error instanceof ApiClientError
          ? settingsQuery.error.message
          : 'Error desconocido'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración del negocio</h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra la información general y las preferencias de tu negocio
          </p>
        </div>
      </div>

      {rootError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {rootError}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información general */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Información general</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Nombre del negocio" htmlFor="name" error={errors.name?.message} required>
              <input id="name" className="input" {...register('name')} />
            </FormField>

            <div className="space-y-1">
              <label className="label" htmlFor="slug">Slug (URL)</label>
              <input
                id="slug" className="input bg-slate-50" readOnly
                value={settingsQuery.data?.slug ?? ''}
              />
            </div>

            <FormField label="Razón social" htmlFor="legalName" error={errors.legalName?.message}>
              <input id="legalName" className="input" {...register('legalName')} />
            </FormField>

            <FormField label="NIT / RFC / CUIT" htmlFor="taxId" error={errors.taxId?.message}>
              <input id="taxId" className="input" {...register('taxId')} />
            </FormField>

            <FormField label="Email de contacto" htmlFor="email" error={errors.email?.message} required>
              <input id="email" className="input" type="email" {...register('email')} />
            </FormField>

            <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
              <input id="phone" className="input" {...register('phone')} />
            </FormField>

            <FormField label="Moneda" htmlFor="currency" error={errors.currency?.message}>
              <select id="currency" className="input" {...register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Zona horaria" htmlFor="timezone" error={errors.timezone?.message}>
              <select id="timezone" className="input" {...register('timezone')}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {/* Feature flags */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Módulos</h2>
          <p className="text-sm text-slate-500">
            Activa o desactiva módulos del sistema según tu plan contratado
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                {...register('moduleReports')}
              />
              <div>
                <div className="font-medium text-slate-900">Reportes</div>
                <div className="text-sm text-slate-500">Generación de reportes PDF y XLSX</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                {...register('moduleInventory')}
              />
              <div>
                <div className="font-medium text-slate-900">Inventario</div>
                <div className="text-sm text-slate-500">Control de inventario y kardex</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                {...register('modulePosStations')}
              />
              <div>
                <div className="font-medium text-slate-900">Estaciones POS</div>
                <div className="text-sm text-slate-500">Estaciones de venta POS</div>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                {...register('moduleDeliveryApp')}
              />
              <div>
                <div className="font-medium text-slate-900">Delivery App</div>
                <div className="text-sm text-slate-500">App de delivery para repartidores</div>
              </div>
            </label>
          </div>
        </div>

        {/* Plan y suscripción */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-slate-900">Plan y suscripción</h3>
          <div className="mt-2 text-sm text-slate-600">
            <p>Plan actual: {settingsQuery.data?.plan ?? 'Ninguno'}</p>
            {settingsQuery.data?.subscription && (
              <p>Estado: {SUBSCRIPTION_STATUS_LABELS[settingsQuery.data.subscription.status] ?? settingsQuery.data.subscription.status}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <SubmitButton
            type="submit"
            isSubmitting={isSubmitting || updateMutation.isPending}
            loadingText="Guardando..."
          >
            Guardar cambios
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
