import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { plansApi } from '~/lib';
import { ConfirmDialog, PlanForm, RoutePending, Skeleton } from '~/components';
import { sileo } from 'sileo';

export const Route = createFileRoute('/_authed/plans/$id')({
  component: PlanEditPage,
  pendingComponent: RoutePending,
});

function PlanEditPage(): ReactNode {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['plans', id],
    queryFn: () => plansApi.getById(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => plansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      sileo.success({ title: 'Plan actualizado correctamente' });
      navigate({ to: '/plans' });
    },
    onError: (err: Error) => sileo.error({ title: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => plansApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      sileo.success({ title: 'Plan eliminado' });
      navigate({ to: '/plans' });
    },
    onError: (err: Error) => sileo.error({ title: err.message }),
  });

  if (error || (!isLoading && !plan)) {
    return (
      <div>
        <Link to="/plans" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block">← Volver a planes</Link>
        <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 p-4 text-red-400 text-sm">
          {error ? String(error) : 'Plan no encontrado'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/plans" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block">← Volver a planes</Link>
      <h1 className="text-2xl font-bold mb-6">
        <Skeleton name="plan-edit-title" loading={isLoading}>
          {plan && `Editar plan: ${plan.name}`}
        </Skeleton>
      </h1>

      <Skeleton name="plan-edit-form" loading={isLoading}>
        {plan && (
          <PlanForm
            initialData={plan}
            submitLabel="Guardar cambios"
            isSubmitting={updateMutation.isPending}
            submitError={updateMutation.isError ? String(updateMutation.error) : null}
            onSubmit={(data) => updateMutation.mutate(data)}
            onCancel={() => navigate({ to: '/plans' })}
          />
        )}
      </Skeleton>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={deleteMutation.isPending}
          className="rounded-md bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar plan'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar plan"
        message="¿Estás seguro de eliminar este plan? Esta acción no se puede deshacer."
        onConfirm={() => { setConfirmOpen(false); deleteMutation.mutate(); }}
        onCancel={() => setConfirmOpen(false)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
