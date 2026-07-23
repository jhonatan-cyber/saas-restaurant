import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { purchasesApi, productsApi, suppliersApi, ApiClientError } from '~/lib/api';
import { useAuthStore } from '~/lib/auth-store';
import { useBranchStore } from '~/lib/branch-store';
import { FormField, RoutePending, SubmitButton } from '~/components';

export const Route = createFileRoute('/_authed/purchases/new')({
  component: NewPurchasePage,
  pendingComponent: RoutePending,
});

interface PurchaseFormData {
  purchaseNumber: string;
  supplierId: string;
  notes: string;
  taxTotal: number;
  items: { productId: string; productName: string; quantity: number; unitCost: number }[];
}

function NewPurchasePage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => suppliersApi.all({ isActive: true }),
    select: (res) => res.data,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'list-all'],
    queryFn: () => productsApi.all(),
    select: (res) => res.data,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormData>({
    defaultValues: {
      purchaseNumber: '',
      supplierId: '',
      notes: '',
      taxTotal: 0,
      items: [{ productId: '', productName: '', quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');
  const taxTotal = watch('taxTotal');

  const calcSubtotal = (): number => {
    return items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0), 0);
  };

  const total = calcSubtotal() + (taxTotal || 0);

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.productId`, productId);
      setValue(`items.${index}.productName`, product.name);
      setValue(`items.${index}.unitCost`, Number(product.cost ?? 0));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: PurchaseFormData) => {
      const payload = {
        branchId: activeBranchId ?? user?.defaultBranchId ?? '',
        supplierId: data.supplierId || undefined,
        purchaseNumber: data.purchaseNumber,
        notes: data.notes || undefined,
        taxTotal: data.taxTotal || 0,
        items: data.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      };
      return purchasesApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      void navigate({ to: '/purchases' });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiClientError ? err.message : 'Error al crear la compra',
      );
    },
  });

  const onSubmit = (values: PurchaseFormData): void => {
    setServerError(null);
    createMutation.mutate(values);
  };

  const subtotal = calcSubtotal();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link to="/purchases" className="text-sm text-slate-500 hover:text-slate-700">
          ← Compras
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nueva compra</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Datos generales */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Datos de la compra</h2>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="N° de compra"
              htmlFor="purchaseNumber"
              required
              error={errors.purchaseNumber?.message}
            >
              <input
                id="purchaseNumber"
                className="input"
                placeholder="FAC-001"
                {...register('purchaseNumber', { required: 'Obligatorio' })}
              />
            </FormField>

            <FormField label="Proveedor" htmlFor="supplierId">
              <select id="supplierId" className="input" {...register('supplierId')}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Notas" htmlFor="notes">
            <textarea id="notes" className="input" rows={2} {...register('notes')} />
          </FormField>
        </div>

        {/* Items */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Productos</h2>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => append({ productId: '', productName: '', quantity: 1, unitCost: 0 })}
            >
              + Agregar producto
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-md">
              <div className="flex-1">
                <select
                  className="input text-sm"
                  value={items[index]?.productId ?? ''}
                  onChange={(e) => selectProduct(index, e.target.value)}
                >
                  <option value="">Seleccionar producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  className="input text-sm"
                  placeholder="Cant."
                  min={0}
                  step="0.01"
                  {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  className="input text-sm"
                  placeholder="Costo"
                  min={0}
                  step="0.01"
                  {...register(`items.${index}.unitCost` as const, { valueAsNumber: true })}
                />
              </div>
              <div className="w-24 pt-2 text-sm text-right text-slate-700 font-medium">
                ${((items[index]?.quantity ?? 0) * (items[index]?.unitCost ?? 0)).toFixed(2)}
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700 pt-2"
                  onClick={() => remove(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* Totales */}
          <div className="border-t border-slate-200 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Impuesto</span>
              <input
                type="number"
                className="input w-28 text-sm text-right"
                min={0}
                step="0.01"
                {...register('taxTotal', { valueAsNumber: true })}
              />
            </div>
            <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Link to="/purchases" className="btn-secondary">Cancelar</Link>
          <SubmitButton isSubmitting={isSubmitting || createMutation.isPending}>
            Crear compra
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
