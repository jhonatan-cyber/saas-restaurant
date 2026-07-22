import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/branches/new')({
  beforeLoad: () => {
    throw redirect({ to: '/branches' });
  },
});
