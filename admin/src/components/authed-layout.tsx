import { useEffect, useState } from 'react';
import { Outlet, useRouter, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { getCurrentUser, setCurrentUser, authApi } from '~/lib';
import { OrbSpinner } from '@saas/ui';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export function AuthedLayout(): ReactNode {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [checking, setChecking] = useState(!user);

  useEffect(() => {
    if (user) {
      setChecking(false);
      return;
    }

    // Verificar sesión contra /auth/me (las cookies HttpOnly se envían automáticamente)
    fetch('/api/admin/auth/me', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('No autenticado');
        return r.json();
      })
      .then((data: AuthUser) => {
        setCurrentUser(data);
        setUser(data);
        setChecking(false);
      })
      .catch(() => {
        router.navigate({ to: '/login', replace: true });
      });
  }, [user, router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <OrbSpinner size={64} state="working" theme="dark" speed={1.25} />
      </div>
    );
  }

  const logout = async () => {
    await authApi.doLogout();
    router.navigate({ to: '/login' });
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <nav className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 p-4">
          <h2 className="text-lg font-bold">MenuGest Admin</h2>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          <Link
            to="/dashboard"
            className="block rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            activeProps={{ className: 'bg-zinc-800 text-white font-medium' }}
          >
            Dashboard
          </Link>
          <Link
            to="/businesses"
            className="block rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            activeProps={{ className: 'bg-zinc-800 text-white font-medium' }}
          >
            Negocios
          </Link>
          <Link
            to="/plans"
            className="block rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            activeProps={{ className: 'bg-zinc-800 text-white font-medium' }}
          >
            Planes
          </Link>
          <Link
            to="/subscriptions"
            className="block rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            activeProps={{ className: 'bg-zinc-800 text-white font-medium' }}
          >
            Suscripciones
          </Link>
          <Link
            to="/saas-users"
            className="block rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            activeProps={{ className: 'bg-zinc-800 text-white font-medium' }}
          >
            Admins
          </Link>
          <Link
            to="/audit-logs"
            className="block rounded px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
            activeProps={{ className: 'bg-zinc-800 text-white font-medium' }}
          >
            Auditoría
          </Link>
        </div>

        <div className="border-t border-zinc-800 p-4">
          <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          <button onClick={logout} className="mt-1 text-xs text-red-400 hover:text-red-300">
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
