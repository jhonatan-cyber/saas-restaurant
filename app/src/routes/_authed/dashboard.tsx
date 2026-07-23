import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { authApi } from '~/lib/api';
import { useDashboardMetrics } from '~/lib/admin-hooks';
import { useAuthStore } from '~/lib/auth-store';
import { RoutePending } from '~/components';
import {
  SalesChart,
  TopProductsList,
  RecentOrdersList,
  PaymentMethodsChart,
  MetricCard,
  QuickAccessCard,
  DashboardHero,
  AlertsPanel,
  BusinessInfo,
  CurrencyIcon,
  ReceiptIcon,
  BoxIcon,
  UsersIcon,
  TableIcon,
  TagIcon,
  TruckIcon,
  FireIcon,
  PackageIcon,
} from '~/components/dashboard';
import type { QuickLink } from '~/components/dashboard';

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
  pendingComponent: RoutePending,
});

function DashboardPage(): ReactNode {
  const navigate = useNavigate();
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
        <div className="card mx-auto max-w-md p-6 text-center">
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
  const activeOrdersCount = as?.total ?? 0;
  const totalTables = ts?.total ?? 0;

  const quickLinks: QuickLink[] = [
    { to: '/categories', title: 'Categorías', description: 'Organiza tu menú en secciones', icon: <TagIcon />, color: 'orange', cta: 'Gestionar', count: c?.categories },
    { to: '/products', title: 'Productos', description: 'Catálogo de platos, bebidas y servicios', icon: <BoxIcon />, color: 'blue', cta: 'Ver catálogo', count: c?.products },
    { to: '/orders', title: 'Órdenes', description: 'Pedidos activos y facturación', icon: <ReceiptIcon />, color: 'green', cta: 'Ver órdenes', count: as?.total },
    { to: '/tables', title: 'Mesas', description: 'Salón, reservas y floor plan', icon: <TableIcon />, color: 'purple', cta: 'Ver mesas', count: ts?.total },
    { to: '/customers', title: 'Clientes', description: 'Directorio de clientes frecuentes', icon: <UsersIcon />, color: 'teal', cta: 'Ver clientes', count: c?.customers },
    { to: '/suppliers', title: 'Proveedores', description: 'Gestión de compras e insumos', icon: <TruckIcon />, color: 'red', cta: 'Ver proveedores', count: c?.users },
  ];

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
      <DashboardHero user={user} metrics={metrics} mounted={mounted} />

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
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Accesos rápidos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link, i) => (
              <QuickAccessCard key={link.to} link={link} index={i} mounted={mounted} />
            ))}
          </div>
        </div>
        <AlertsPanel metrics={metrics} mounted={mounted} />
      </div>

      {/* ── Charts Row: Sales + Top Products ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSection title="Ventas últimos 7 días" subtitle={`Total: $${metrics?.weeklySalesTrend.total.toLocaleString('es-BO') ?? '0'}`} index={0} mounted={mounted}>
          <SalesChart
            data={{
              labels: metrics?.weeklySalesTrend.days.map((d) => d.label) ?? [],
              values: metrics?.weeklySalesTrend.days.map((d) => d.total) ?? [],
              currency: user?.business.currency ?? 'BOB',
            }}
            isLoading={metricsLoading}
            error={metricsError instanceof Error ? metricsError.message : null}
          />
        </ChartSection>
        <ChartSection title="Productos más vendidos hoy" index={1} mounted={mounted}>
          <TopProductsList items={metrics?.topProducts.items ?? []} total={metrics?.topProducts.total ?? 0} isLoading={metricsLoading} />
        </ChartSection>
      </div>

      {/* ── Charts Row: Payment Methods + Recent Orders ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSection title="Métodos de pago hoy" index={2} mounted={mounted}>
          <PaymentMethodsChart methods={metrics?.paymentMethods.methods ?? []} total={metrics?.paymentMethods.total ?? '0'} isLoading={metricsLoading} />
        </ChartSection>
        <ChartSection title="Órdenes activas recientes" index={3} mounted={mounted} linkTo="/orders" linkLabel="Ver todas">
          <RecentOrdersList orders={metrics?.activeOrdersByStatus.recent ?? []} isLoading={metricsLoading} />
        </ChartSection>
      </div>

      {/* ── Business Info + Branches ── */}
      <BusinessInfo user={user} mounted={mounted} />

      {/* ── Additional links row ── */}
      <div
        className="flex flex-wrap gap-3"
        style={{ opacity: mounted ? 1 : 0, transition: 'all 0.5s ease-out 0.9s' }}
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

// ── Chart Section Wrapper ─────────────────────────────────────────────────

interface ChartSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  index: number;
  mounted: boolean;
  linkTo?: string;
  linkLabel?: string;
}

function ChartSection({ title, subtitle, children, index, mounted, linkTo, linkLabel }: ChartSectionProps): ReactNode {
  const delay = 0.8 + index * 0.05;
  return (
    <div
      className="rounded-xl border border-slate-200/80 bg-white p-5"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.5s ease-out ${delay}s`,
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        {linkTo && linkLabel && (
          <Link to={linkTo as any} className="text-xs font-medium text-slate-600 hover:text-slate-800">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
