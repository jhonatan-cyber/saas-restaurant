import { useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { ROLE_LABELS } from '@saas/shared';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/categories', label: 'Categorías', icon: <TagIcon /> },
  { to: '/products', label: 'Productos', icon: <BoxIcon /> },
  { to: '/preparation-areas', label: 'Áreas de Preparación', icon: <FireIcon /> },
  { to: '/tables', label: 'Mesas', icon: <TableIcon /> },
  { to: '/customers', label: 'Clientes', icon: <UsersIcon /> },
];

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Layout para rutas autenticadas.
 *  - Sidebar con links a las secciones.
 *  - Topbar con info del usuario y botón de logout.
 *  - En mobile: sidebar colapsable (drawer con overlay).
 *  - Active route resaltada.
 */
export function AdminLayout({ children }: AdminLayoutProps): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  const storedUser = useAuthStore((s) => s.user);

  const [mobileOpen, setMobileOpen] = useState(false);

  // Refresh del usuario (mismo patrón del dashboard de Phase 1)
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    retry: 1,
  });
  const user = me ?? storedUser;

  const location = useRouterState({ select: (s) => s.location });
  const currentPath = location.pathname;

  const handleLogout = (): void => {
    clear();
    queryClient.clear();
    void navigate({ to: '/login' });
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
            {user.business.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.business.name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.business.plan}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPath === item.to || currentPath.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center ${
                    isActive ? 'text-brand-600' : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-secondary px-2 py-1 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-500">
                {ROLE_LABELS[user.role]} · {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.defaultBranchId ? (
              <span className="hidden text-xs text-slate-500 sm:inline">
                Sucursal default configurada
              </span>
            ) : null}
            <button onClick={handleLogout} className="btn-secondary">
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

// ============== Iconos (inline, sin dependencias) ==============

function DashboardIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}

function TagIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function BoxIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function FireIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function TableIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function UsersIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MenuIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
