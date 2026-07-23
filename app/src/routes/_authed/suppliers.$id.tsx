import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, Link, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { suppliersApi, ApiClientError } from '~/lib/api';
import { supplierFormSchema, type SupplierFormValues } from '~/lib/schemas';
import { BranchSelect, FormField, RoutePending, SubmitButton } from '~/components';

export const Route = createFileRoute('/_authed/suppliers/$id')({
  component: EditSupplierPage,
  pendingComponent: RoutePending,
});
function EditSupplierPage(): ReactNode {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const supplierQuery = useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => suppliersApi.get(id),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      taxId: '',
      notes: '',
      isActive: true,
      branchId: '',
    },
  });

  useEffect(() => {
    if (supplierQuery.data) {
      const s = supplierQuery.data;
      reset({
        name: s.name,
        contactName: s.contactName ?? '',
        email: s.email ?? '',
        phone: s.phone ?? '',
        address: s.address ?? '',
        taxId: s.taxId ?? '',
        notes: s.notes ?? '',
        isActive: s.isActive,
        branchId: s.branchId ?? '',
      });
    }
  }, [supplierQuery.data, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: SupplierFormValues) => suppliersApi.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      void navigate({ to: '/suppliers' });
    },
    onError: (err: unknown) => {
      setServerError(
        err instanceof ApiClientError ? err.message : 'Error al actualizar el proveedor',
      );
    },
  });

  const onSubmit = (values: SupplierFormValues): void => {
    setServerError(null);
    updateMutation.mutate(values);
  };

  if (supplierQuery.isLoading) return <p className="text-slate-500">Cargando…</p>;
  if (supplierQuery.error) {
    return <p className="text-red-600">Error: {String(supplierQuery.error)}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to="/suppliers" className="text-sm text-slate-500 hover:text-slate-700">
          ← Proveedores
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar proveedor</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4" noValidate>
        <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
          <input id="name" className="input" {...register('name')} />
        </FormField>

        <FormField label="Nombre de contacto" htmlFor="contactName" error={errors.contactName?.message}>
          <input id="contactName" className="input" {...register('contactName')} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
            <input id="phone" className="input" {...register('phone')} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <input id="email" className="input" type="email" {...register('email')} />
          </FormField>
        </div>

        <FormField label="Dirección" htmlFor="address" error={errors.address?.message}>
          <input id="address" className="input" {...register('address')} />
        </FormField>

        <FormField label="NIT / RUC" htmlFor="taxId" error={errors.taxId?.message}>
          <input id="taxId" className="input" {...register('taxId')} />
        </FormField>

        <FormField label="Sucursal" htmlFor="branchId" hint="Opcional" error={errors.branchId?.message}>
          <BranchSelect value={watch('branchId') ?? ''} onChange={(v) => setValue('branchId', v)} />
        </FormField>

        <FormField label="Notas" htmlFor="notes" error={errors.notes?.message}>
          <textarea id="notes" className="input" rows={2} {...register('notes')} />
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} className="rounded" />
          <span className="text-slate-700">Proveedor activo</span>
        </label>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/suppliers" className="btn-secondary">Cancelar</Link>
          <SubmitButton isSubmitting={isSubmitting || updateMutation.isPending}>
            Guardar cambios
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
