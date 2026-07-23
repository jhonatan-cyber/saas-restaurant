import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  planFormSchema,
  planFormToCreateInput,
  type PlanFormInput,
} from '@saas/shared';
import type { PlanItem } from '~/lib';

const BILLING_OPTIONS = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY', label: 'Anual' },
];

interface PlanFormProps {
  /** Si se provee, el formulario se inicializa con los datos del plan (modo edición) */
  initialData?: PlanItem | null;
  /** Label del botón de submit */
  submitLabel?: string;
  /** Loading state del submit */
  isSubmitting?: boolean;
  /** Error del submit */
  submitError?: string | null;
  /** Callback al submit con los datos transformados (features → array) */
  onSubmit: (payload: ReturnType<typeof planFormToCreateInput>) => void;
  /** Callback para cancelar/volver */
  onCancel?: () => void;
}

function planToFormDefaults(plan: PlanItem): Partial<PlanFormInput> {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    price: Number(plan.price),
    currency: plan.currency,
    billingPeriod: plan.billingPeriod,
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
    maxProducts: plan.maxProducts,
    maxCategories: plan.maxCategories,
    maxMonthlyOrders: plan.maxMonthlyOrders,
    maxStorageMb: plan.maxStorageMb,
    featuresString: (plan.features ?? []).join(', '),
    isActive: plan.isActive,
    isPublic: plan.isPublic,
    sortOrder: plan.sortOrder,
  };
}

export function PlanForm({
  initialData,
  submitLabel = 'Guardar',
  isSubmitting = false,
  submitError = null,
  onSubmit,
  onCancel,
}: PlanFormProps): ReactNode {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormInput>({
    resolver: zodResolver(planFormSchema) as unknown as Resolver<PlanFormInput>,
    defaultValues: {
      code: '',
      name: '',
      description: '',
      price: 0,
      currency: 'USD',
      billingPeriod: 'MONTHLY',
      maxUsers: 5,
      maxBranches: 1,
      maxProducts: 50,
      maxCategories: 10,
      maxMonthlyOrders: 500,
      maxStorageMb: 100,
      maxTables: 20,
      maxSuppliers: 30,
      maxPurchases: 100,
      featuresString: '',
      isActive: true,
      isPublic: true,
      sortOrder: 0,
    },
  });

  // Reset form when initialData changes (edit mode)
  useEffect(() => {
    if (initialData) {
      reset(planToFormDefaults(initialData));
    }
  }, [initialData, reset]);

  const onFormSubmit = (values: PlanFormInput) => {
    onSubmit(planFormToCreateInput(values));
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Código" error={errors.code?.message}>
          <input
            type="text"
            {...register('code')}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm"
          />
        </Field>
        <Field label="Nombre" error={errors.name?.message}>
          <input
            type="text"
            {...register('name')}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm"
          />
        </Field>
      </div>

      <Field label="Descripción" error={errors.description?.message}>
        <textarea
          {...register('description')}
          rows={2}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Precio ($)" error={errors.price?.message}>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('price')}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm"
          />
        </Field>
        <Field label="Moneda" error={errors.currency?.message}>
          <select
            {...register('currency')}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="USD">USD</option>
            <option value="BOB">BOB</option>
          </select>
        </Field>
        <Field label="Facturación" error={errors.billingPeriod?.message}>
          <select
            {...register('billingPeriod')}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-sm"
          >
            {BILLING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Máx. usuarios" error={errors.maxUsers?.message}>
          <input type="number" min="1" {...register('maxUsers')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Máx. sucursales" error={errors.maxBranches?.message}>
          <input type="number" min="1" {...register('maxBranches')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Máx. productos" error={errors.maxProducts?.message}>
          <input type="number" min="1" {...register('maxProducts')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Máx. categorías" error={errors.maxCategories?.message}>
          <input type="number" min="1" {...register('maxCategories')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Órdenes/mes" error={errors.maxMonthlyOrders?.message}>
          <input type="number" min="1" {...register('maxMonthlyOrders')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Storage (MB)" error={errors.maxStorageMb?.message}>
          <input type="number" min="1" {...register('maxStorageMb')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Máx. mesas" error={errors.maxTables?.message}>
          <input type="number" min="1" {...register('maxTables')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Máx. proveedores" error={errors.maxSuppliers?.message}>
          <input type="number" min="1" {...register('maxSuppliers')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <Field label="Máx. compras" error={errors.maxPurchases?.message}>
          <input type="number" min="1" {...register('maxPurchases')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
      </div>

      <Field label="Features (separadas por coma)" error={errors.featuresString?.message}>
        <input
          type="text"
          {...register('featuresString')}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm"
          placeholder="reportes, inventario, pos"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Orden" error={errors.sortOrder?.message}>
          <input type="number" min="0" {...register('sortOrder')} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none text-sm" />
        </Field>
        <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300">
          <input type="checkbox" {...register('isActive')} className="rounded" />
          Plan activo
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300">
          <input type="checkbox" {...register('isPublic')} className="rounded" />
          Público
        </label>
      </div>

      {submitError && (
        <p className="text-sm text-red-400">Error: {submitError}</p>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, error, children }: {
  label: string;
  error?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
