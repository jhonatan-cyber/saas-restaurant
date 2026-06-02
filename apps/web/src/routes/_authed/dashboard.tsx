import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { authApi, categoriesApi, productsApi, tablesApi, customersApi } from '../../lib/api';
import { useAuthStore, authStoreHelpers } from '../../lib/auth-store';
import { ROLE_LABELS, TABLE_STATUS_LABELS, type AuthenticatedUserDTO } from '@saas/shared';

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
});

interface QuickLink {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  count?: number;
  cta: string;
}

function DashboardPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const setUser = useAuthStore((s) => s.setUser);

  // Refresca los datos del usuario en cada mount del dashboard
  const { data: me, isLoading, error } = useQuery<AuthenticatedUserDTO>({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (me && (!storedUser || storedUser.id !== me.id)) {
      setUser(me);
    }
  }, [me, storedUser, setUser]);

  const user = me ?? storedUser;

  // Conteo rápido de cada sección (best-effort, no rompe el dashboard)
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'count'],
    queryFn: () => categoriesApi.list({ pageSize: 1 }),
    staleTime: 30_000,
  });
  const { data: productsData } = useQuery({
    queryKey: ['products', 'count'],
    queryFn: () => productsApi.list({ pageSize: 1 }),
    staleTime: 30_000,
  });
  const { data: tablesData } = useQuery({
    queryKey: ['tables', 'count'],
    queryFn: () => tablesApi.list({ pageSize: 100 }),
    staleTime: 30_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'count'],
    queryFn: () => customersApi.list({ pageSize: 1 }),
    staleTime: 30_000,
  });

  const handleLogout = (): void => {
    clear();
    queryClient.clear();
    void navigate({ to: '/login' });
  };

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="px-4 py-8">
        <div className="card p-6 max-w-md mx-auto text-center">
          <p className="text-red-600 font-medium">No se pudo cargar tu sesión.</p>
          <p className="text-sm text-slate-500 mt-2">Vuelve a iniciar sesión.</p>
          <button onClick={handleLogout} className="btn-primary mt-4 w-full">
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const quickLinks: QuickLink[] = [
    {
      to: '/categories',
      title: 'Categorías',
      description: 'Organiza tu menú en secciones',
      icon: <CategoryIcon />,
      count: categoriesData?.meta.total,
      cta: 'Ver categorías',
    },
    {
      to: '/products',
      title: 'Productos',
      description: 'Tu catálogo de platos, bebidas y servicios',
      icon: <ProductIcon />,
      count: productsData?.meta.total,
      cta: 'Ver productos',
    },
    {
      to: '/preparation-areas',
      title: 'Áreas de Preparación',
      description: 'Cocina, bar, cafetería, etc.',
      icon: <AreaIcon />,
      cta: 'Ver áreas',
    },
    {
      to: '/tables',
      title: 'Mesas',
      description: 'Salón, reservas y floor plan',
      icon: <TableIcon />,
      count: tablesData?.meta.total,
      cta: 'Ver mesas',
    },
    {
      to: '/customers',
      title: 'Clientes',
      description: 'Directorio y walk-ins',
      icon: <CustomerIcon />,
      count: customersData?.meta.total,
      cta: 'Ver clientes',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bienvenido, {user.fullName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tienes sesión activa como <strong>{ROLE_LABELS[user.role]}</strong> en{' '}
          <strong>{user.business.name}</strong>.
        </p>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  {link.icon}
                </div>
                {link.count !== undefined && (
                  <span className="text-xs font-medium text-slate-500">
                    {link.count} {link.count === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{link.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{link.description}</p>
              <p className="mt-3 text-sm font-medium text-brand-600">{link.cta} →</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Resumen del business */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Información del negocio</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Moneda</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{user.business.currency}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Zona horaria</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{user.business.timezone}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{user.business.plan}</p>
          </div>
        </div>
      </div>

      {/* Sucursales */}
      <div className="card">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Sucursales</h2>
          <p className="mt-1 text-sm text-slate-500">
            {user.branches.length} sucursal{user.branches.length === 1 ? '' : 'es'} activa
            {user.branches.length === 1 ? '' : 's'}.
          </p>
        </div>
        <ul className="divide-y divide-slate-200">
          {user.branches.map((branch) => (
            <li key={branch.id} className="p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{branch.name}</p>
                  {branch.isMain && (
                    <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                      Principal
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {branch.code} · {branch.address ?? 'Sin dirección'}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  branch.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {branch.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Resumen de mesas (si hay) */}
      {tablesData && tablesData.data.length > 0 && (
        <div className="card">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Estado del salón</h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            {(['FREE', 'OCCUPIED', 'RESERVED'] as const).map((status) => {
              const count = tablesData.data.filter((t) => t.status === status).length;
              const label = TABLE_STATUS_LABELS[status];
              const colorClass =
                status === 'FREE'
                  ? 'text-green-600'
                  : status === 'OCCUPIED'
                    ? 'text-red-600'
                    : 'text-yellow-600';
              return (
                <div key={status} className="p-4 text-center">
                  <p className={`text-2xl font-bold ${colorClass}`}>{count}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pt-4">
        Phase 2 · Catálogo, mesas y clientes están listos. Phase 3 sumará el flujo de pedido.
      </p>
    </div>
  );
}

// ============== Iconos (mismo set que el sidebar) ==============

function CategoryIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    </svg>
  );
}
function ProductIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}
function AreaIcon(): ReactNode {
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
function CustomerIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}
