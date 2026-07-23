import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { categoriesApi } from '~/lib/api';
import { handleMutationError } from '~/lib/error-handler';
import { categoryFormSchema, type CategoryFormValues } from '~/lib/schemas';
import { slugify } from '~/lib/slugify';
import { FormField, RoutePending, SubmitButton } from '~/components';
import { useAuthStore } from '~/lib/auth-store';

export const Route = createFileRoute('/_authed/categories/$id')({
  component: EditCategoryPage,
  pendingComponent: RoutePending,
});

function EditCategoryPage(): ReactNode {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);

  const categoryQuery = useQuery({
    queryKey: ['categories', id],
    queryFn: () => categoriesApi.get(id),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['auth', 'branches'],
    queryFn: async () => user?.branches ?? [],
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      displayOrder: 0,
      branchId: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (categoryQuery.data) {
      const c = categoryQuery.data;
      reset({
        name: c.name,
        slug: c.slug,
        description: c.description ?? '',
        imageUrl: c.imageUrl ?? '',
        displayOrder: c.displayOrder,
        branchId: c.branchId ?? '',
        isActive: c.isActive,
      });
    }
  }, [categoryQuery.data, reset]);

  const nameValue = watch('name');

  // Si el slug coincide con el original cuando el usuario edita el nombre,
  // mantenemos el slug en sync. Si ya lo cambió a mano, lo dejamos.
  useEffect(() => {
    const current = categoryQuery.data;
    if (!current) return;
    const newSlug = slugify(nameValue ?? '');
    // Si el slug actual era el derivado del nombre, actualizar al nuevo
    if (current.slug === slugify(current.name)) {
      setValue('slug', newSlug);
    }
  }, [nameValue, categoryQuery.data, setValue]);

  const updateMutation = useMutation({
    mutationFn: (data: CategoryFormValues) => {
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl,
        displayOrder: data.displayOrder,
        branchId: data.branchId || undefined,
        isActive: data.isActive,
      };
      return categoriesApi.update(id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void navigate({ to: '/categories' });
    },
    onError: handleMutationError(setServerError, { fallback: 'Error al actualizar la categoría' }),
  });

  const onSubmit = (values: CategoryFormValues): void => {
    setServerError(null);
    updateMutation.mutate(values);
  };

  if (categoryQuery.isLoading) {
    return <p className="text-slate-500">Cargando…</p>;
  }
  if (categoryQuery.error) {
    return (
      <p className="text-red-600">Error al cargar la categoría: {String(categoryQuery.error)}</p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/categories" className="text-sm text-slate-500 hover:text-slate-700">
          ← Categorías
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar categoría</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <input id="name" className="input" {...register('name')} />
        </FormField>

        <FormField label="Slug" htmlFor="slug" required error={errors.slug?.message}>
          <input id="slug" className="input" {...register('slug')} />
        </FormField>

        <FormField label="Descripción" htmlFor="description" error={errors.description?.message}>
          <textarea id="description" className="input" rows={2} {...register('description')} />
        </FormField>

        <FormField label="URL de imagen" htmlFor="imageUrl" error={errors.imageUrl?.message}>
          <input id="imageUrl" className="input" type="url" {...register('imageUrl')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Orden" htmlFor="displayOrder" error={errors.displayOrder?.message}>
            <input
              id="displayOrder"
              className="input"
              type="number"
              min={0}
              {...register('displayOrder', { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Sucursal" htmlFor="branchId">
            <select id="branchId" className="input" {...register('branchId')}>
              <option value="">Aplica a todo el business</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} className="rounded" />
          <span className="text-slate-700">Categoría activa</span>
        </label>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/categories" className="btn-secondary">
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
