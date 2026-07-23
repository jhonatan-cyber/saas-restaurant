import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { branchesApi } from '~/lib/api';
import { extractErrorMessage } from '~/lib/error-handler';
import { branchFormSchema, type BranchFormValues } from '~/lib/schemas';

interface BranchFormProps {
  branchId?: string;
  initialData?: {
    name: string;
    code: string;
    address: string;
    phone: string;
    isMain: boolean;
  };
  onSuccess?: () => void;
}

export function BranchForm({ branchId, initialData, onSuccess }: BranchFormProps): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(branchId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: initialData ?? {
      name: '',
      code: '',
      address: '',
      phone: '',
      isMain: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: BranchFormValues) => {
      const payload = {
        name: data.name,
        code: data.code,
        address: data.address || undefined,
        phone: data.phone || undefined,
        isMain: data.isMain,
      };
      if (branchId) return branchesApi.update(branchId, payload);
      return branchesApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      if (onSuccess) {
        onSuccess();
      } else {
        void navigate({ to: '/branches' });
      }
    },
    onError: (err: unknown) => {
      setServerError(extractErrorMessage(err, isEditing ? 'Error al actualizar la sucursal' : 'Error al crear la sucursal'));
    },
  });

  const onSubmit = (values: BranchFormValues): void => {
    setServerError(null);
    mutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Nombre */}
      <div className="space-y-1.5">
        <label htmlFor="branch-name" className="block text-sm font-medium text-slate-300 light:text-slate-700">
          Nombre <span className="text-red-400">*</span>
        </label>
        <input
          id="branch-name"
          type="text"
          placeholder="Sucursal Central"
          className="w-full rounded-xl border border-slate-700/60 light:border-slate-300 bg-slate-800/50 light:bg-white px-4 py-2.5 text-sm text-white light:text-slate-900 placeholder:text-slate-500 light:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:border-slate-500 transition-all"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      {/* Código */}
      <div className="space-y-1.5">
        <label htmlFor="branch-code" className="block text-sm font-medium text-slate-300 light:text-slate-700">
          Código <span className="text-red-400">*</span>
        </label>
        <input
          id="branch-code"
          type="text"
          placeholder="CEN"
          className="w-full rounded-xl border border-slate-700/60 light:border-slate-300 bg-slate-800/50 light:bg-white px-4 py-2.5 text-sm font-mono uppercase text-white light:text-slate-900 placeholder:text-slate-500 light:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:border-slate-500 transition-all"
          {...register('code')}
        />
        {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
        <p className="text-xs text-slate-500">Identificador corto único. Solo mayúsculas, números y guiones.</p>
      </div>

      {/* Dirección */}
      <div className="space-y-1.5">
        <label htmlFor="branch-address" className="block text-sm font-medium text-slate-300 light:text-slate-700">
          Dirección
        </label>
        <input
          id="branch-address"
          type="text"
          placeholder="Av. Principal #123"
          className="w-full rounded-xl border border-slate-700/60 light:border-slate-300 bg-slate-800/50 light:bg-white px-4 py-2.5 text-sm text-white light:text-slate-900 placeholder:text-slate-500 light:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:border-slate-500 transition-all"
          {...register('address')}
        />
        {errors.address && <p className="text-xs text-red-400">{errors.address.message}</p>}
      </div>

      {/* Teléfono */}
      <div className="space-y-1.5">
        <label htmlFor="branch-phone" className="block text-sm font-medium text-slate-300 light:text-slate-700">
          Teléfono
        </label>
        <input
          id="branch-phone"
          type="text"
          placeholder="+591 71234567"
          className="w-full rounded-xl border border-slate-700/60 light:border-slate-300 bg-slate-800/50 light:bg-white px-4 py-2.5 text-sm text-white light:text-slate-900 placeholder:text-slate-500 light:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:border-slate-500 transition-all"
          {...register('phone')}
        />
        {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
      </div>

      {/* Sucursal principal */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            className="peer sr-only"
            {...register('isMain')}
          />
          <div className="h-5 w-5 rounded-md border border-slate-600 light:border-slate-300 bg-slate-800/50 light:bg-white peer-checked:bg-white peer-checked:border-white light:peer-checked:bg-black light:peer-checked:border-black transition-all flex items-center justify-center">
            <svg className="h-3 w-3 text-slate-900 light:text-white opacity-0 peer-checked:opacity-100" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6l3 3 5-5" />
            </svg>
          </div>
        </div>
        <span className="text-sm text-slate-300 light:text-slate-700 group-hover:text-white light:group-hover:text-black transition-colors">
          Sucursal principal
        </span>
      </label>

      {/* Error del servidor */}
      {serverError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{serverError}</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onSuccess && (
          <button
            type="button"
            onClick={onSuccess}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black hover:bg-white/5 light:hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg shadow-white/10 transition-all hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 light:bg-black light:text-white light:shadow-black/10 light:hover:bg-black/90"
        >
          {isSubmitting || mutation.isPending
            ? 'Guardando…'
            : isEditing
              ? 'Guardar cambios'
              : 'Crear sucursal'}
        </button>
      </div>
    </form>
  );
}
