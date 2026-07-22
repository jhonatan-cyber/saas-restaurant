import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  productsApi,
  categoriesApi,
  preparationAreasApi,
  ApiClientError,
} from '~/lib/api';
import { productFormSchema, type ProductFormValues } from '~/lib/schemas';
import { FormField } from '~/components/form-field';
import { SelectField } from '~/components/select-field';
import { TextareaField } from '~/components/textarea-field';
import { SubmitButton } from '~/components/submit-button';
import { useAuthStore } from '~/lib/auth-store';
import { ComboItemsEditor } from '~/components/combo-items-editor';
import { BulkPricingEditor } from '~/components/bulk-pricing-editor';
import { PRODUCT_TYPE_LABELS, type ProductType } from '@saas/shared';

export const Route = createFileRoute('/_authed/products/$id')({
  component: EditProductPage,
});

function EditProductPage(): ReactNode {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);

  const productQuery = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['auth', 'branches'],
    queryFn: async () => user?.branches ?? [],
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', { all: true }],
    queryFn: () => categoriesApi.all({ isActive: true }),
    select: (res) => res.data,
  });

  const { data: prepAreas = [] } = useQuery({
    queryKey: ['preparation-areas', { all: true }],
    queryFn: () => preparationAreasApi.all({ isActive: true }),
    select: (res) => res.data,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      categoryId: '',
      preparationAreaId: '',
      branchId: '',
      sku: '',
      price: 0,
      productType: 'SALE',
      trackStock: false,
      isActive: true,
      isAvailable: true,
    },
  });

  useEffect(() => {
    if (productQuery.data) {
      const p = productQuery.data;
      reset({
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        imageUrl: p.imageUrl ?? '',
        categoryId: p.categoryId ?? '',
        preparationAreaId: p.preparationAreaId ?? '',
        branchId: p.branchId ?? '',
        sku: p.sku ?? '',
        price: Number(p.price),
        cost: p.cost ? Number(p.cost) : undefined,
        taxRate: p.taxRate ? Number(p.taxRate) : undefined,
        trackStock: p.trackStock,
        minStock: p.minStock ?? undefined,
        productType: p.productType,
        comboItems: p.comboItems ?? [],
        bulkPricing: p.bulkPricing ?? [],
        preparationTimeMin: p.preparationTimeMin ?? undefined,
        isActive: p.isActive,
        isAvailable: p.isAvailable,
      });
    }
  }, [productQuery.data, reset]);

  const productTypeValue = watch('productType');

  const updateMutation = useMutation({
    mutationFn: (data: ProductFormValues) => {
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId || undefined,
        preparationAreaId: data.preparationAreaId || undefined,
        branchId: data.branchId || undefined,
        sku: data.sku,
        price: data.price,
        cost: data.cost,
        taxRate: data.taxRate,
        trackStock: data.trackStock,
        minStock: data.minStock,
        productType: data.productType,
        comboItems: data.comboItems?.length ? data.comboItems : undefined,
        bulkPricing: data.bulkPricing?.length ? data.bulkPricing : undefined,
        preparationTimeMin: data.preparationTimeMin,
        isActive: data.isActive,
        isAvailable: data.isAvailable,
      };
      return productsApi.update(id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void navigate({ to: '/products' });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiClientError ? err.message : 'Error al actualizar el producto',
      );
    },
  });

  const onSubmit = (values: ProductFormValues): void => {
    setServerError(null);
    updateMutation.mutate(values);
  };

  if (productQuery.isLoading) {
    return <p className="text-slate-500">Cargando…</p>;
  }
  if (productQuery.error) {
    return <p className="text-red-600">Error: {String(productQuery.error)}</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link to="/products" className="text-sm text-slate-500 hover:text-slate-700">
          ← Productos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar producto</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
            <input id="name" className="input" {...register('name')} />
          </FormField>
          <FormField label="SKU" htmlFor="sku" error={errors.sku?.message}>
            <input id="sku" className="input" {...register('sku')} />
          </FormField>
        </div>

        <FormField label="Slug" htmlFor="slug" required error={errors.slug?.message}>
          <input id="slug" className="input" {...register('slug')} />
        </FormField>

        <TextareaField
          label="Descripción"
          htmlFor="description"
          error={errors.description?.message}
          value={watch('description') ?? ''}
          onChange={(v) => setValue('description', v, { shouldValidate: true })}
          rows={2}
        />

        <FormField label="URL de imagen" htmlFor="imageUrl" error={errors.imageUrl?.message}>
          <input id="imageUrl" className="input" type="url" {...register('imageUrl')} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField
            label="Categoría"
            htmlFor="categoryId"
            value={watch('categoryId') ?? ''}
            onChange={(v) => setValue('categoryId', v, { shouldValidate: true })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Sin categoría"
          />
          <SelectField
            label="Área de preparación"
            htmlFor="preparationAreaId"
            value={watch('preparationAreaId') ?? ''}
            onChange={(v) => setValue('preparationAreaId', v, { shouldValidate: true })}
            options={prepAreas.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Sin área"
          />
        </div>

        <SelectField
          label="Sucursal"
          htmlFor="branchId"
          value={watch('branchId') ?? ''}
          onChange={(v) => setValue('branchId', v, { shouldValidate: true })}
          options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          placeholder="Aplica a todo el business"
        />

        <div>
          <label className="label">Tipo de producto</label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  productTypeValue === type
                    ? 'border-slate-500 bg-slate-100 text-slate-900'
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input type="radio" value={type} {...register('productType')} className="sr-only" />
                {PRODUCT_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        </div>

        {/* F5-01: Combo Items Editor */}
        {productTypeValue === 'COMBO' && (
          <ComboItemsEditor
            items={watch('comboItems') ?? []}
            onChange={(items) => setValue('comboItems', items, { shouldValidate: true })}
          />
        )}

        {/* F5-02: Bulk Pricing Editor */}
        <BulkPricingEditor
          tiers={watch('bulkPricing') ?? []}
          basePrice={watch('price') || 0}
          onChange={(tiers) => setValue('bulkPricing', tiers, { shouldValidate: true })}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField label="Precio" htmlFor="price" required error={errors.price?.message}>
            <input
              id="price"
              className="input"
              type="number"
              step="0.01"
              min={0}
              {...register('price', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Costo" htmlFor="cost" error={errors.cost?.message}>
            <input
              id="cost"
              className="input"
              type="number"
              step="0.01"
              min={0}
              {...register('cost', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Tasa de impuesto (%)" htmlFor="taxRate" error={errors.taxRate?.message}>
            <input
              id="taxRate"
              className="input"
              type="number"
              step="0.01"
              min={0}
              max={100}
              {...register('taxRate', { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Tiempo de preparación (min)"
            htmlFor="preparationTimeMin"
            error={errors.preparationTimeMin?.message}
          >
            <input
              id="preparationTimeMin"
              className="input"
              type="number"
              min={0}
              max={600}
              {...register('preparationTimeMin', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Stock mínimo" htmlFor="minStock" error={errors.minStock?.message}>
            <input
              id="minStock"
              className="input"
              type="number"
              min={0}
              disabled={!watch('trackStock')}
              {...register('minStock', { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('trackStock')} className="rounded" />
            <span className="text-slate-700">Controlar stock</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isActive')} className="rounded" />
            <span className="text-slate-700">Activo</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isAvailable')} className="rounded" />
            <span className="text-slate-700">Disponible para la venta</span>
          </label>
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/products" className="btn-secondary">
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
