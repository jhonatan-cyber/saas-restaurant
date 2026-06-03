import { useEffect } from 'react';
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { authStoreHelpers, useAuthStore } from '../lib/auth-store';
import { connectRealtime, disconnectRealtime } from '../lib/realtime';
import { useRealtimeInvalidation } from '../lib/use-realtime-invalidation';
import { AdminLayout } from '../components/admin-layout';

/**
 * Layout pathless (`_authed`) para rutas protegidas.
 * Verifica token antes de renderizar; redirige a /login si no hay sesión.
 * Las rutas anidadas en `_authed/` se renderizan dentro de <AdminLayout>
 * que provee sidebar + topbar.
 *
 * También es el lugar donde se conecta el WebSocket: una sola conexión
 * por sesión autenticada, y el hook de invalidación mapea eventos → React Query.
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
  const token = useAuthStore((s) => s.accessToken);

  // Conectar el WS al entrar a la zona autenticada, desconectar al salir.
  // El JWT se reusa del auth-store: cuando expira y se refresca, el siguiente
  // reconnect automático del socket (por reconnectionDelay) revalida contra
  // el nuevo token? NO — el socket mantiene el token del handshake. Por eso
  // si el token cambia, reconectamos manualmente.
  useEffect(() => {
    if (!token) {
      disconnectRealtime();
      return;
    }
    connectRealtime();
    return () => {
      // No desconectamos en cleanup: el singleton persiste entre navegaciones
      // dentro de _authed. Solo se desconecta si el componente AuthedLayout
      // se desmonta completamente (logout / cambio de ruta fuera de _authed).
    };
  }, [token]);

  // Cleanup al desmontar el layout completo (logout).
  useEffect(() => {
    return () => {
      disconnectRealtime();
    };
  }, []);

  // Suscribe el hook de invalidación (mapea eventos WS → queryClient).
  useRealtimeInvalidation();

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
