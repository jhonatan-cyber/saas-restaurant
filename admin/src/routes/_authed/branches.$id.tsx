import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/branches/$id')({
  beforeLoad: () => {
    throw redirect({ to: '/branches' });
  },
});
