import { useEffect, useState } from 'react';
import { createFileRoute, redirect, Outlet, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { authStoreHelpers, useAuthStore } from '../lib/auth-store';
import { connectRealtime, disconnectRealtime } from '../lib/realtime';
import { useRealtimeInvalidation } from '../lib/use-realtime-invalidation';
import { AdminLayout } from '../components/admin-layout';
import { RouteErrorBoundary } from '../components/route-error-boundary';
import { NotFound } from '../components/not-found';
import { ADMIN_ROUTE_ROLES } from '@saas/shared/rbac';
import { Role } from '@saas/shared';

/**
 * Layout pathless (`_authed`) para rutas protegidas.
 * Verifica sesión (usuario en store + validez de cookies via /auth/me)
 * antes de renderizar; redirige a /login si no hay sesión.
 *
 * MEJORA DE SEGURIDAD:
 *  - La autenticación ahora usa cookies HttpOnly (no tokens en JS).
 *  - El auth-store guarda el user para hidratación rápida.
 *  - La validez real de la sesión se verifica en /auth/me ($query).
 *
 * Las rutas anidadas en `_authed/` se renderizan dentro de <AdminLayout>
 * que provee sidebar + topbar.
 *
 * También es el lugar donde se conecta el WebSocket.
 */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ location }) => {
    // En SSR no hay localStorage — zustand persist no puede rehidratar.
    // El componente se encarga de redirigir después de la hidratación.
    if (typeof document === 'undefined') return;

    const user = authStoreHelpers.getUser();
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }

    const path = location.pathname.replace(/^\/app/, '') || '/';
    const routeKey = Object.keys(ADMIN_ROUTE_ROLES).find((key) =>
      path === key || path.startsWith(`${key}/`)
    );

    if (routeKey) {
      const allowedRoles = ADMIN_ROUTE_ROLES[routeKey];
      if (!allowedRoles?.includes(user.role as Role)) {
        throw redirect({ to: '/dashboard' });
      }
    }
  },
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <NotFound />,
  component: AuthedLayout,
});

function AuthedLayout(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // Esperar hidratación de zustand persist y redirigir si no hay sesión
  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.navigate({ to: '/login', replace: true });
      return;
    }
    setChecked(true);
  }, [isHydrated, user, router]);

  // Conectar el WS al entrar a la zona autenticada, desconectar al salir.
  useEffect(() => {
    if (!user) {
      disconnectRealtime();
      return;
    }
    connectRealtime();
    return () => {
      // No desconectamos en cleanup: el singleton persiste entre navegaciones
      // dentro de _authed. Solo se desconecta si el componente AuthedLayout
      // se desmonta completamente (logout / cambio de ruta fuera de _authed).
    };
  }, [user]);

  // Cleanup al desmontar el layout completo (logout).
  useEffect(() => {
    return () => {
      disconnectRealtime();
    };
  }, []);

  // Suscribe el hook de invalidación (mapea eventos WS → queryClient).
  useRealtimeInvalidation();

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-black light:bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-white" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
