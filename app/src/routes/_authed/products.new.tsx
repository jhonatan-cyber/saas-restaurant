import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  productsApi,
  categoriesApi,
  preparationAreasApi,
} from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { productFormSchema, type ProductFormValues } from '~/lib/schemas';
import { slugify } from '~/lib/slugify';
import { BulkPricingEditor, ComboItemsEditor, FormField, RoutePending, SelectField, SubmitButton, TextareaField } from '~/components';
import { useAuthStore } from '~/lib/auth-store';
import { PRODUCT_TYPE_LABELS, type ProductType } from '@saas/shared';

export const Route = createFileRoute('/_authed/products/new')({
  component: NewProductPage,
  pendingComponent: RoutePending,
});

function NewProductPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

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
      cost: undefined,
      taxRate: 13,
      trackStock: false,
      minStock: undefined,
      productType: 'SALE',
      comboItems: [],
      preparationTimeMin: undefined,
      isActive: true,
      isAvailable: true,
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (!slugTouched) {
      setValue('slug', slugify(nameValue ?? ''));
    }
  }, [nameValue, slugTouched, setValue]);

  const productTypeValue = watch('productType');

  const createMutation = useMutation({
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
      return productsApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void navigate({ to: '/products' });
    },
    onError: handleMutationError(setServerError, { fallback: 'Error al crear el producto' }),
  });

  const onSubmit = (values: ProductFormValues): void => {
    setServerError(null);
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link to="/products" className="text-sm text-slate-500 hover:text-slate-700">
          ← Productos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nuevo producto</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
            <input id="name" className="input" {...register('name')} />
          </FormField>
          <FormField label="SKU" htmlFor="sku" error={errors.sku?.message}>
            <input id="sku" className="input" placeholder="BEB-001" {...register('sku')} />
          </FormField>
        </div>

        <FormField label="Slug" htmlFor="slug" required error={errors.slug?.message}>
          <input
            id="slug"
            className="input"
            {...register('slug', {
              onChange: () => setSlugTouched(true),
            })}
          />
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
          <input
            id="imageUrl"
            className="input"
            type="url"
            placeholder="https://…"
            {...register('imageUrl')}
          />
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
          hint="Opcional. Si está vacía aplica a todo el business."
          value={watch('branchId') ?? ''}
          onChange={(v) => setValue('branchId', v, { shouldValidate: true })}
          options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          placeholder="Aplica a todo el business"
        />          <div>
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
                  <input
                    type="radio"
                    value={type}
                    {...register('productType')}
                    className="sr-only"
                  />
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
          <FormField label="Tiempo de preparación (min)" htmlFor="preparationTimeMin" error={errors.preparationTimeMin?.message}>
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
          <SubmitButton isSubmitting={isSubmitting || createMutation.isPending}>
            Crear producto
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
