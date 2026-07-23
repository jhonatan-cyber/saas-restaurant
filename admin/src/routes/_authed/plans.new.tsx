import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { plansApi } from '~/lib';
import { PlanForm, RoutePending } from '~/components';

export const Route = createFileRoute('/_authed/plans/new')({
  component: PlanNewPage,
  pendingComponent: RoutePending,
});

function PlanNewPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => plansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigate({ to: '/plans' });
    },
  });

  return (
    <div>
      <Link to="/plans" className="text-sm text-blue-400 hover:text-blue-300 mb-4 inline-block">← Volver a planes</Link>
      <h1 className="text-2xl font-bold mb-6">Nuevo plan</h1>

      <PlanForm
        submitLabel="Crear plan"
        isSubmitting={createMutation.isPending}
        submitError={createMutation.isError ? String(createMutation.error) : null}
        onSubmit={(data) => createMutation.mutate(data)}
        onCancel={() => navigate({ to: '/plans' })}
      />
    </div>
  );
}
