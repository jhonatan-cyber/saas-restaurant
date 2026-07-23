import { createFileRoute, redirect } from '@tanstack/react-router';
import { getCurrentUser } from '~/lib';
import { AuthedLayout, RoutePending } from '~/components';

export const Route = createFileRoute('/_authed')({
  beforeLoad: () => {
    if (!getCurrentUser()) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthedLayout,
  pendingComponent: RoutePending,
});
