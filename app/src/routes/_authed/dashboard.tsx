import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { authApi } from '~/lib/api';
import { useDashboardMetrics } from '~/lib/admin-hooks';
import { useAuthStore } from '~/lib/auth-store';
import { ROLE_LABELS, TABLE_STATUS_LABELS } from '@saas/shared';
import { RoutePending } from '~/components';
import { SalesChart, TopProductsList, RecentOrdersList, PaymentMethodsChart } from '~/components/dashboard';

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
  pendingComponent: RoutePending,
});

// ── Iconos SVG inline ───────────────────────────────────────────────────────

function BoxIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function TagIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function UsersIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function TableIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  );
}

function ReceiptIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  );
}

function TruckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

function BranchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="2" y="2" width="20" height="8" rx="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/>
      <line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  );
}

function FireIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
  );
}

function PackageIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z"/>
      <polyline points="2.32 6.16 12 11 21.68 6.16"/>
      <line x1="12" y1="22.76" x2="12" y2="11"/>
    </svg>
  );
}

function CurrencyIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="8"/>
      <path d="M15 9h-4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4"/>
      <line x1="10" y1="7" x2="10" y2="17"/>
    </svg>
  );
}

function ClockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function CrownIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M12 2l3 5 5.5-1.5L19 10l4 4-6 2-2 6-2-6-6-2 4-4-1.5-6.5L9 7z"/>
    </svg>
  );
}

function AlertIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10z" clipRule="evenodd"/>
    </svg>
  );
}

// ── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string | undefined;
  icon: ReactNode;
  color: 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'teal';
  to?: string;
  index: number;
  mounted: boolean;
}

const colorMap = {
  orange: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  blue: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  green: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  purple: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  red: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
  teal: { bg: 'bg-black/5', text: 'text-slate-600', ring: 'ring-black/10' },
};

function MetricCard({ label, value, icon, color, to, index, mounted }: MetricCardProps) {
  const c = colorMap[color];
  const content = (
    <div
      className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: `all 0.4s ease-out ${0.1 + index * 0.07}s`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ${c.text} ${c.ring} ring-1`}>
          {icon}
        </div>
        <span className={`text-2xl font-bold ${c.text}`}>
          {value ?? <span className="inline-block h-6 w-10 animate-pulse rounded bg-slate-200" />}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      {/* Shine effect on hover */}
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 -translate-x-full rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
    </div>
  );

  if (to) {
    return <Link to={to as any}>{content}</Link>;
  }
  return content;
}

// ── Quick Access Card ───────────────────────────────────────────────────────

interface QuickLink {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  color: 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'teal';
  cta: string;
  count?: number;
}

function QuickAccessCard({ link, index, mounted }: { link: QuickLink; index: number; mounted: boolean }) {
  const c = colorMap[link.color];
  return (
    <Link
      to={link.to as any}
      className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s ease-out ${0.25 + index * 0.08}s`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ${c.text} ring-1 ${c.ring}`}>
          {link.icon}
        </div>
        {link.count !== undefined && (
          <span className={`inline-flex items-center justify-center rounded-full ${c.bg} px-2.5 py-0.5 text-xs font-semibold ${c.text}`}>
            {link.count}
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{link.title}</h3>
      <p className="mt-1 text-xs text-slate-500">{link.description}</p>
      <p className={`mt-3 flex items-center gap-1 text-xs font-medium ${c.text} transition-all group-hover:gap-1.5`}>
        {link.cta}
        <ArrowRightIcon />
      </p>
      {/* Shine */}
      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 -translate-x-full rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100" />
    </Link>
  );
}

// ── Dashboard Page ──────────────────────────────────────────────────────────

function DashboardPage(): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const setUser = useAuthStore((s) => s.setUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Refresh user data
  const { data: me, isLoading: userLoading, error: userError } = useQuery({
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

  // Dashboard metrics - consolidated single endpoint
  const branchId = user?.branches?.[0]?.id ?? undefined;
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics(branchId);

  const handleLogout = (): void => {
    clear();
    queryClient.clear();
    void navigate({ to: '/login' });
  };

  if (userLoading && !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  if (userError && !user) {
    return (
      <div className="px-4 py-8">
        <div className="card p-6 mx-auto max-w-md text-center">
          <p className="font-medium text-red-600">No se pudo cargar tu sesión.</p>
          <p className="mt-2 text-sm text-slate-500">Vuelve a iniciar sesión.</p>
          <button onClick={handleLogout} className="btn-primary mt-4 w-full">
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const c = metrics?.counts;
  const ts = metrics?.tablesSummary;
  const as = metrics?.activeOrdersByStatus;

  const quickLinks: QuickLink[] = [
    { to: '/categories', title: 'Categorías', description: 'Organiza tu menú en secciones', icon: <TagIcon />, color: 'orange', cta: 'Gestionar', count: c?.categories },
    { to: '/products', title: 'Productos', description: 'Catálogo de platos, bebidas y servicios', icon: <BoxIcon />, color: 'blue', cta: 'Ver catálogo', count: c?.products },
    { to: '/orders', title: 'Órdenes', description: 'Pedidos activos y facturación', icon: <ReceiptIcon />, color: 'green', cta: 'Ver órdenes', count: as?.total },
    { to: '/tables', title: 'Mesas', description: 'Salón, reservas y floor plan', icon: <TableIcon />, color: 'purple', cta: 'Ver mesas', count: ts?.total },
    { to: '/customers', title: 'Clientes', description: 'Directorio de clientes frecuentes', icon: <UsersIcon />, color: 'teal', cta: 'Ver clientes', count: c?.customers },
    { to: '/suppliers', title: 'Proveedores', description: 'Gestión de compras e insumos', icon: <TruckIcon />, color: 'red', cta: 'Ver proveedores', count: c?.users },
  ];

  const activeOrdersCount = as?.total ?? 0;
  const freeTables = ts?.free ?? 0;
  const occupiedTables = ts?.occupied ?? 0;
  const totalTables = ts?.total ?? 0;
  const occupancyPct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.1); } 50% { box-shadow: 0 0 30px rgba(255,255,255,0.2); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-up { animation: fadeInUp 0.4s ease-out forwards; }
        .animate-slide-right { animation: slideInRight 0.4s ease-out forwards; }
        .bar-fill { animation: barFill 1s ease-out forwards; }
        @keyframes barFill { from { width: 0%; } }
      `}</style>

      {/* ── Hero Section ── */}
      <div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white lg:p-8"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease-out',
        }}
      >
        {/* Background decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Bienvenido, {user.fullName.split(' ')[0]}
                </h1>
                <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-slate-300 ring-1 ring-white/30">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-400">
                {user.business.name} · {user.business.plan}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* ── Mini metrics row ── */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Ventas hoy', value: metrics?.todaySales.total ? `$${Number(metrics.todaySales.total).toLocaleString('es-BO')}` : '$0', color: 'text-slate-100' },
              { label: 'Órdenes activas', value: activeOrdersCount, color: 'text-slate-100' },
              { label: 'Mesas ocupadas', value: `${occupiedTables}/${totalTables}`, color: 'text-slate-100' },
              { label: 'Ocupación', value: `${occupancyPct}%`, color: 'text-slate-100' },
            ].map((item, i) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                  transition: `all 0.5s ease-out ${0.3 + i * 0.1}s`,
                }}
              >
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className={`mt-0.5 text-lg font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Ventas hoy" value={metrics?.todaySales.total ? `$${Number(metrics.todaySales.total).toLocaleString('es-BO')}` : '$0'} icon={<CurrencyIcon />} color="green" index={0} mounted={mounted} />
        <MetricCard label="Órdenes hoy" value={metrics?.todayOrdersCount.total} icon={<ReceiptIcon />} color="blue" to="/orders" index={1} mounted={mounted} />
        <MetricCard label="Productos" value={c?.products} icon={<BoxIcon />} color="orange" to="/products" index={2} mounted={mounted} />
        <MetricCard label="Clientes" value={c?.customers} icon={<UsersIcon />} color="purple" to="/customers" index={3} mounted={mounted} />
        <MetricCard label="Órdenes activas" value={activeOrdersCount} icon={<ReceiptIcon />} color="red" to="/orders" index={4} mounted={mounted} />
        <MetricCard label="Mesas" value={totalTables} icon={<TableIcon />} color="teal" to="/tables" index={5} mounted={mounted} />
      </div>

      {/* ── Quick Access + Alerts ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Access Cards */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Accesos rápidos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link, i) => (
              <QuickAccessCard key={link.to} link={link} index={i} mounted={mounted} />
            ))}
          </div>
        </div>

        {/* Alerts Sidebar */}
        <div>
          <h2
            className="mb-3 text-sm font-semibold text-slate-900"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'all 0.5s ease-out 0.6s',
            }}
          >
            Alertas & Estado
          </h2>

          {/* Low Stock Alert */}
          {(c?.lowStock ?? 0) > 0 && (
            <div
              className="mb-3 overflow-hidden rounded-xl border border-red-200/80 bg-white"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all 0.5s ease-out 0.65s',
              }}
            >
              <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/50 px-4 py-2.5">
                <AlertIcon className="h-4 w-4 text-red-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  Stock bajo ({c?.lowStock})
                </span>
              </div>
              <div className="px-4 py-3 text-center">
                <Link to="/inventory" className="text-xs font-medium text-red-600 hover:text-red-700">
                  Ir a inventario
                </Link>
              </div>
            </div>
          )}

          {/* Table Occupancy */}
          {ts && ts.total > 0 && (
            <div
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all 0.5s ease-out 0.7s',
              }}
            >
              <div className="border-b border-slate-200 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Ocupación del salón
                </span>
              </div>

              {/* Bar */}
              <div className="px-4 pt-4">
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-emerald-400 transition-all duration-1000 ease-out"
                      style={{ width: `${(freeTables / totalTables) * 100}%` }}
                    />
                    <div
                      className="bg-amber-400 transition-all duration-1000 delay-200 ease-out"
                      style={{ width: `${(occupiedTables / totalTables) * 100}%` }}
                    />
                    <div
                      className="bg-slate-300 transition-all duration-1000 delay-400 ease-out"
                      style={{ width: `${((ts.reserved ?? 0) / totalTables) * 100}%` }}
                    />
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 px-2 pb-4 pt-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{freeTables}</p>
                  <p className="text-xs text-slate-500">Libres</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-600">{occupiedTables}</p>
                  <p className="text-xs text-slate-500">Ocupadas</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-500">{ts.reserved}</p>
                  <p className="text-xs text-slate-500">Reservadas</p>
                </div>
              </div>
            </div>
          )}

          {/* Average ticket */}
          <div
            className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.5s ease-out 0.75s',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Ticket promedio</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {metrics?.todaySales.average ? `$${Number(metrics.todaySales.average).toLocaleString('es-BO')}` : '$0'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {metrics?.todaySales.count ?? 0} órdenes pagadas hoy
            </p>
          </div>
        </div>
      </div>

      {/* ── Charts Row: Sales + Top Products ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sales Trend Chart */}
        <div
          className="rounded-xl border border-slate-200/80 bg-white p-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out 0.8s',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Ventas últimos 7 días</h2>
            <span className="text-xs text-slate-500">
              Total: ${metrics?.weeklySalesTrend.total.toLocaleString('es-BO') ?? '0'}
            </span>
          </div>
          <SalesChart
            data={{
              labels: metrics?.weeklySalesTrend.days.map((d) => d.label) ?? [],
              values: metrics?.weeklySalesTrend.days.map((d) => d.total) ?? [],
              currency: user?.business.currency ?? 'BOB',
            }}
            isLoading={metricsLoading}
            error={metricsError instanceof Error ? metricsError.message : null}
          />
        </div>

        {/* Top Products */}
        <div
          className="rounded-xl border border-slate-200/80 bg-white p-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out 0.85s',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Productos más vendidos hoy</h2>
          </div>
          <TopProductsList
            items={metrics?.topProducts.items ?? []}
            total={metrics?.topProducts.total ?? 0}
            isLoading={metricsLoading}
          />
        </div>
      </div>

      {/* ── Charts Row: Payment Methods + Recent Orders ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Methods */}
        <div
          className="rounded-xl border border-slate-200/80 bg-white p-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out 0.9s',
          }}
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Métodos de pago hoy</h2>
          <PaymentMethodsChart
            methods={metrics?.paymentMethods.methods ?? []}
            total={metrics?.paymentMethods.total ?? '0'}
            isLoading={metricsLoading}
          />
        </div>

        {/* Recent Orders */}
        <div
          className="rounded-xl border border-slate-200/80 bg-white p-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out 0.95s',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Órdenes activas recientes</h2>
            <Link to="/orders" className="text-xs font-medium text-slate-600 hover:text-slate-800">
              Ver todas
            </Link>
          </div>
          <RecentOrdersList
            orders={metrics?.activeOrdersByStatus.recent ?? []}
            isLoading={metricsLoading}
          />
        </div>
      </div>

      {/* ── Business Info + Branches ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Business Info */}
        <div
          className="rounded-xl border border-slate-200/80 bg-white p-5"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out 0.75s',
          }}
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Información del negocio</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <CurrencyIcon className="mx-auto h-5 w-5 text-slate-500" />
              <p className="mt-1.5 text-lg font-bold text-slate-900">{user.business.currency}</p>
              <p className="text-xs text-slate-500">Moneda</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <ClockIcon className="mx-auto h-5 w-5 text-slate-500" />
              <p className="mt-1.5 text-lg font-bold text-slate-900">{user.business.timezone}</p>
              <p className="text-xs text-slate-500">Zona horaria</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <CrownIcon className="mx-auto h-5 w-5 text-slate-500" />
              <p className="mt-1.5 text-lg font-bold text-slate-900">{user.business.plan}</p>
              <p className="text-xs text-slate-500">Plan</p>
            </div>
          </div>
        </div>

        {/* Branches */}
        <div
          className="rounded-xl border border-slate-200/80 bg-white"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease-out 0.8s',
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <div className="flex items-center gap-2">
              <BranchIcon className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Sucursales ({user.branches.length})
              </h2>
            </div>
            <Link to="/branches" className="text-xs font-medium text-slate-600 hover:text-slate-800">
              Gestionar
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {user.branches.map((branch, i) => (
              <div
                key={branch.id}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `all 0.4s ease-out ${0.85 + i * 0.1}s`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    branch.isMain ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {branch.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-900">{branch.name}</span>
                      {branch.isMain && (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{branch.code}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  branch.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {branch.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Additional links row ── */}
      <div
        className="flex flex-wrap gap-3"
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'all 0.5s ease-out 0.9s',
        }}
      >
        {[
          { to: '/preparation-areas', label: 'Áreas de Preparación', icon: <FireIcon className="h-3.5 w-3.5" /> },
          { to: '/purchases', label: 'Compras', icon: <PackageIcon className="h-3.5 w-3.5" /> },
          { to: '/inventory', label: 'Inventario', icon: <BoxIcon className="h-3.5 w-3.5" /> },
          { to: '/reports', label: 'Reportes', icon: <ReceiptIcon className="h-3.5 w-3.5" /> },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to as any}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:text-slate-800 hover:shadow-sm"
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
