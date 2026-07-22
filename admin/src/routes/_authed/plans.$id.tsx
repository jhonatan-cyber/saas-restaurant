import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { plansApi, ApiClientError } from '~/lib/api';
import { BillingPeriod } from '@saas/shared';

export const Route = createFileRoute('/_authed/plans/$id')({
  component: PlanEditPage,
});

interface PlanForm {
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  billingPeriod: string;
  maxUsers: string;
  maxBranches: string;
  maxProducts: string;
  maxCategories: string;
  maxMonthlyOrders: string;
  maxStorageMb: string;
  features: string;
  isPublic: boolean;
  sortOrder: string;
  isActive: boolean;
}

function PlanEditPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams({ from: Route.id });

  const [form, setForm] = useState<PlanForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planQuery = useQuery({
    queryKey: ['plan', id],
    queryFn: () => plansApi.getById(id),
    enabled: !!id,
  });

  /* Poblar form */
  if (planQuery.data && !form) {
    setForm({
      code: planQuery.data.code,
      name: planQuery.data.name,
      description: planQuery.data.description ?? '',
      price: planQuery.data.price,
      currency: planQuery.data.currency,
      billingPeriod: planQuery.data.billingPeriod,
      maxUsers: String(planQuery.data.maxUsers),
      maxBranches: String(planQuery.data.maxBranches),
      maxProducts: String(planQuery.data.maxProducts),
      maxCategories: String(planQuery.data.maxCategories),
      maxMonthlyOrders: String(planQuery.data.maxMonthlyOrders),
      maxStorageMb: String(planQuery.data.maxStorageMb),
      features: (planQuery.data.features ?? []).join(', '),
      isPublic: planQuery.data.isPublic,
      sortOrder: String(planQuery.data.sortOrder),
      isActive: planQuery.data.isActive,
    });
  }

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('Form not initialized');
      return plansApi.update(id, {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        currency: form.currency,
        billingPeriod: form.billingPeriod,
        maxUsers: Number(form.maxUsers),
        maxBranches: Number(form.maxBranches),
        maxProducts: Number(form.maxProducts),
        maxCategories: Number(form.maxCategories),
        maxMonthlyOrders: Number(form.maxMonthlyOrders),
        maxStorageMb: Number(form.maxStorageMb),
        features: form.features.split(',').map((f) => f.trim()).filter(Boolean),
        isPublic: form.isPublic,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plans'] });
      void navigate({ to: '/plans' });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al actualizar';
      setError(msg);
    },
  });

  const update = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);
    updateMutation.mutate();
  };

  if (planQuery.isLoading) {
    return <div className="p-8 text-center text-slate-500">Cargando...</div>;
  }

  if (planQuery.isError) {
    return (
      <div className="p-8 text-center text-red-500">
        Error: {planQuery.error instanceof ApiClientError ? planQuery.error.message : 'Error desconocido'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editar plan</h1>
        <p className="text-sm text-slate-500 mt-1">{form?.code ?? ''}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {form && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          {/* Info básica - mismos campos que el create */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="label" htmlFor="code">Código *</label>
              <input id="code" className="input uppercase" required value={form.code}
                onChange={(e) => update('code', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="name">Nombre *</label>
              <input id="name" className="input" required value={form.name}
                onChange={(e) => update('name', e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="label" htmlFor="description">Descripción</label>
              <input id="description" className="input" value={form.description}
                onChange={(e) => update('description', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="price">Precio *</label>
              <input id="price" className="input" type="number" step="0.01" min="0" required value={form.price}
                onChange={(e) => update('price', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="currency">Moneda</label>
              <select id="currency" className="input" value={form.currency}
                onChange={(e) => update('currency', e.target.value)}>
                <option value="USD">USD</option>
                <option value="BOB">BOB</option>
                <option value="ARS">ARS</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="billingPeriod">Ciclo</label>
              <select id="billingPeriod" className="input" value={form.billingPeriod}
                onChange={(e) => update('billingPeriod', e.target.value)}>
                <option value="MONTHLY">Mensual</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="sortOrder">Orden</label>
              <input id="sortOrder" className="input" type="number" min="0" value={form.sortOrder}
                onChange={(e) => update('sortOrder', e.target.value)} />
            </div>
          </div>

          {/* Límites */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Límites</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { key: 'maxUsers' as const, label: 'Máx. usuarios' },
                { key: 'maxBranches' as const, label: 'Máx. sucursales' },
                { key: 'maxProducts' as const, label: 'Máx. productos' },
                { key: 'maxCategories' as const, label: 'Máx. categorías' },
                { key: 'maxMonthlyOrders' as const, label: 'Máx. órdenes/mes' },
                { key: 'maxStorageMb' as const, label: 'Máx. almacenamiento (MB)' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <label className="label" htmlFor={key}>{label} *</label>
                  <input id={key} className="input" type="number" min="1" required value={form[key]}
                    onChange={(e) => update(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-1">
            <label className="label" htmlFor="features">Features (separadas por coma)</label>
            <input id="features" className="input" value={form.features}
              onChange={(e) => update('features', e.target.value)} />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={form.isPublic}
                onChange={(e) => update('isPublic', e.target.checked)} />
              <span className="text-sm font-medium text-slate-900">Público</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={form.isActive}
                onChange={(e) => update('isActive', e.target.checked)} />
              <span className="text-sm font-medium text-slate-900">Activo</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" className="btn-secondary" onClick={() => void navigate({ to: '/plans' })}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
