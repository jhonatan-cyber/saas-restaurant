import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { authStoreHelpers } from '../lib/auth-store';
import { AdminLayout } from '../components/admin-layout';

/**
 * Layout pathless (`_authed`) para rutas protegidas.
 * Verifica token antes de renderizar; redirige a /login si no hay sesión.
 * Las rutas anidadas en `_authed/` se renderizan dentro de <AdminLayout>
 * que provee sidebar + topbar.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ location }) => {
    if (!authStoreHelpers.isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: AuthedLayout,
});

function AuthedLayout(): ReactNode {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
