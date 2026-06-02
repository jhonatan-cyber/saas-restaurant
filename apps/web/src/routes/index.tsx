import { createFileRoute, redirect } from '@tanstack/react-router';
import { authStoreHelpers } from '../lib/auth-store';

/**
 * Ruta raíz: redirige según estado de autenticación.
 *  - Si hay token → /dashboard
 *  - Si no → /login
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (authStoreHelpers.isAuthenticated()) {
      throw redirect({ to: '/dashboard' });
    }
    throw redirect({ to: '/login' });
  },
});
