import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { businessApi, subscriptionApi, plansApi, ApiClientError, type UpdateBusinessData } from '~/lib/api';
import { SUBSCRIPTION_STATUS_LABELS, BILLING_PERIOD_LABELS } from '@saas/shared';

export const Route = createFileRoute('/_authed/business')({
  component: BusinessSettingsPage,
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

interface BusinessForm {
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  currency: string;
  timezone: string;
  moduleReports: boolean;
  moduleInventory: boolean;
  modulePosStations: boolean;
  moduleDeliveryApp: boolean;
}

function BusinessSettingsPage(): ReactNode {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BusinessForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => businessApi.getSettings(),
  });

  /* Poblar form cuando se cargan los datos */
  useEffect(() => {
    if (settingsQuery.data && !form) {
      setForm({
        name: settingsQuery.data.name,
        legalName: settingsQuery.data.legalName ?? '',
        taxId: settingsQuery.data.taxId ?? '',
        email: settingsQuery.data.email,
        phone: settingsQuery.data.phone ?? '',
        currency: settingsQuery.data.currency,
        timezone: settingsQuery.data.timezone,
        moduleReports: settingsQuery.data.moduleReports,
        moduleInventory: settingsQuery.data.moduleInventory,
        modulePosStations: settingsQuery.data.modulePosStations,
        moduleDeliveryApp: settingsQuery.data.moduleDeliveryApp,
      });
    }
  }, [settingsQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBusinessData) => businessApi.updateSettings(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      setSuccess('Configuración guardada correctamente');
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al guardar';
      setError(msg);
      setSuccess(null);
    },
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSuccess(null);
    updateMutation.mutate(form);
  };

  const update = <K extends keyof BusinessForm>(key: K, value: BusinessForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {form && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información general */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Información general</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="label" htmlFor="name">Nombre del negocio *</label>
                <input
                  id="name" className="input" required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="slug">Slug (URL)</label>
                <input
                  id="slug" className="input bg-slate-50" readOnly
                  value={settingsQuery.data?.slug ?? ''}
                />
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="legalName">Razón social</label>
                <input
                  id="legalName" className="input"
                  value={form.legalName}
                  onChange={(e) => update('legalName', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="taxId">NIT / RFC / CUIT</label>
                <input
                  id="taxId" className="input"
                  value={form.taxId}
                  onChange={(e) => update('taxId', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="email">Email de contacto *</label>
                <input
                  id="email" className="input" type="email" required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="phone">Teléfono</label>
                <input
                  id="phone" className="input"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="currency">Moneda</label>
                <select
                  id="currency" className="input"
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="timezone">Zona horaria</label>
                <select
                  id="timezone" className="input"
                  value={form.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
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
                  checked={form.moduleReports}
                  onChange={(e) => update('moduleReports', e.target.checked)}
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
                  checked={form.moduleInventory}
                  onChange={(e) => update('moduleInventory', e.target.checked)}
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
                  checked={form.modulePosStations}
                  onChange={(e) => update('modulePosStations', e.target.checked)}
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
                  checked={form.moduleDeliveryApp}
                  onChange={(e) => update('moduleDeliveryApp', e.target.checked)}
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
                <p>Estado: {settingsQuery.data.subscription.status}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="btn-primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
