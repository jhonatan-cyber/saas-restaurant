import { useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { ROLE_LABELS } from '@saas/shared';
import { useThemeStore } from '../lib/theme-store';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ── Iconos ───────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" strokeLinejoin="round" />
    </svg>
  );
}
function PosIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="13" y2="12" />
      <circle cx="17" cy="16" r="1" />
      <circle cx="13" cy="16" r="1" />
    </svg>
  );
}
function KdsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M3 11h18M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3" />
      <path d="M6 11v6a2 2 0 002 2h8a2 2 0 002-2v-6" />
      <path d="M9 16h6" />
    </svg>
  );
}
function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M14 2H6a2 2 0 00-2 2v16l3-2 3 2 3-2 3 2 3-2V8z" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function BranchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}
function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <line x1="6" y1="12" x2="6.01" y2="12" />
      <line x1="18" y1="12" x2="18.01" y2="12" />
    </svg>
  );
}
function CashMovementIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" strokeLinejoin="round" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinejoin="round" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M12.89 1.45l8 4A2 2 0 0122 7.24v9.53a2 2 0 01-1.11 1.79l-8 4a2 2 0 01-1.79 0l-8-4A2 2 0 011.1 16.77V7.24a2 2 0 011.11-1.79l8-4a2 2 0 011.78 0z" strokeLinejoin="round" />
      <polyline points="2.32 6.16 12 11 21.68 6.16" strokeLinejoin="round" />
      <line x1="12" y1="22.76" x2="12" y2="11" />
    </svg>
  );
}
function InventoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinejoin="round" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
      <polyline points="9 12 11 14 15 10" strokeLinejoin="round" />
    </svg>
  );
}
function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" strokeLinejoin="round" />
    </svg>
  );
}
function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinejoin="round" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function UserManagementIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 010 7.75" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="16" rx="2" strokeLinejoin="round" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="10" y1="16" x2="14" y2="16" />
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
    </svg>
  );
}
function CollapseIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="1" x2="12" y2="3" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Navegación agrupada ──────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      { to: '/pos', label: 'Punto de Venta', icon: <PosIcon /> },
      { to: '/kds', label: 'Cocina (KDS)', icon: <KdsIcon /> },
      { to: '/orders', label: 'Órdenes', icon: <ReceiptIcon /> },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { to: '/branches', label: 'Sucursales', icon: <BranchIcon /> },
      { to: '/cash', label: 'Caja', icon: <CashIcon /> },
      { to: '/cash-movements', label: 'Mov. de Caja', icon: <CashMovementIcon /> },
      { to: '/categories', label: 'Categorías', icon: <TagIcon /> },
      { to: '/products', label: 'Productos', icon: <BoxIcon /> },
      { to: '/suppliers', label: 'Proveedores', icon: <TruckIcon /> },
      { to: '/purchases', label: 'Compras', icon: <PackageIcon /> },
      { to: '/inventory', label: 'Inventario', icon: <InventoryIcon /> },
      { to: '/reports', label: 'Reportes', icon: <ReportsIcon /> },
      { to: '/preparation-areas', label: 'Áreas de Prep.', icon: <FireIcon /> },
      { to: '/tables', label: 'Mesas', icon: <TableIcon /> },
      { to: '/customers', label: 'Clientes', icon: <UsersIcon /> },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/users', label: 'Usuarios', icon: <UserManagementIcon /> },
      { to: '/business', label: 'Negocio', icon: <SettingsIcon /> },
      { to: '/plans', label: 'Planes', icon: <PlanIcon /> },
      { to: '/audit', label: 'Auditoría', icon: <AuditIcon /> },
    ],
  },
];

// ── Componente de item de navegación ────────────────────────────────────────

function NavItemLink({ item, currentPath, collapsed, onClick }: {
  item: NavItem;
  currentPath: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  const isActive = currentPath === item.to || currentPath.startsWith(`${item.to}/`);

  return (
    <Link
      to={item.to as any}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-brand-500/10 light:bg-brand-50 text-brand-400 light:text-brand-700'
          : 'text-slate-400 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-100 hover:text-slate-200 light:hover:text-slate-700'
      }`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute inset-y-1.5 -left-3 w-0.5 rounded-full bg-brand-500 shadow-sm shadow-brand-500/50" />
      )}

      <span className={`flex items-center justify-center transition-colors ${
        isActive ? 'text-brand-400 light:text-brand-600' : 'text-slate-500 group-hover:text-slate-300 light:group-hover:text-slate-600'
      }`}>
        {item.icon}
      </span>

      {!collapsed && <span>{item.label}</span>}

      {/* Tooltip when collapsed */}
      {collapsed && (              <div className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-lg ring-1 ring-white/10 group-hover:block whitespace-nowrap z-50">
          {item.label}
        </div>
      )}
    </Link>
  );
}

// ── Admin Layout ─────────────────────────────────────────────────────────────

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  const storedUser = useAuthStore((s) => s.user);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Refresh user
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    retry: 1,
  });
  const user = me ?? storedUser;

  const location = useRouterState({ select: (s) => s.location });
  const currentPath = location.pathname;
  const { theme, toggle: toggleTheme } = useThemeStore();

  const handleLogout = (): void => {
    clear();
    queryClient.clear();
    void navigate({ to: '/login' });
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Cargando…</p>
        </div>
      </div>
    );
  }

  const initial = user.business.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen light:bg-slate-50 bg-slate-950">
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 light:bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } border-slate-800/60 light:border-slate-200 bg-slate-900/95 light:bg-white/95 backdrop-blur-xl lg:translate-x-0`}
      >
        {/* Brand */}
        <div className={`flex items-center border-b border-slate-800/60 light:border-slate-200 px-4 ${
          collapsed ? 'justify-center h-16' : 'h-16 gap-3'
        }`}>
          {collapsed ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-lg shadow-brand-500/25">
              {initial}
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white shadow-lg shadow-brand-500/25">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white light:text-slate-900">
                  {user.business.name}
                </p>
                <p className="truncate text-xs text-slate-500 light:text-slate-400">{user.business.plan}</p>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <div className="flex flex-col gap-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500 light:text-slate-400">
                    {group.label}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavItemLink
                      key={item.to}
                      item={item}
                      currentPath={currentPath}
                      collapsed={collapsed}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Theme toggle + Collapse */}
        <div className="hidden border-t border-slate-800/60 light:border-slate-200 lg:flex items-stretch">
          <button
            onClick={toggleTheme}
            className="flex flex-1 items-center justify-center gap-2 px-2 py-3 text-slate-500 transition-colors hover:text-slate-300 light:hover:text-slate-600"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            {!collapsed && <span className="text-xs">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex flex-1 items-center justify-center px-2 py-3 text-slate-500 transition-colors hover:text-slate-300 light:hover:text-slate-600"
            title={collapsed ? 'Expandir' : 'Colapsar'}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <CollapseIcon open={!collapsed} />
          </button>
        </div>

        {/* User footer */}
        <div className={`border-t border-slate-800/60 light:border-slate-200 bg-slate-900/80 light:bg-slate-50/80 p-3 ${
          collapsed ? 'flex justify-center' : ''
        }`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 light:bg-slate-200 text-sm font-semibold text-slate-300 light:text-slate-600 ring-2 ring-slate-700/50 light:ring-slate-300/50">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:text-slate-300 light:hover:text-slate-600"
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 light:hover:bg-red-100"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogoutIcon />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:text-slate-300 light:hover:text-slate-600"
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 light:bg-slate-200 text-sm font-semibold text-slate-300 light:text-slate-600 ring-2 ring-slate-700/50 light:ring-slate-300/50">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200 light:text-slate-800">{user.fullName}</p>
                <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 light:hover:bg-red-100"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogoutIcon />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800/60 light:border-slate-200 bg-slate-900/80 light:bg-white/80 backdrop-blur-xl px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 light:hover:bg-slate-100 light:hover:text-slate-600 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>
            <div>
              <p className="text-sm font-semibold text-white light:text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-500">
                {ROLE_LABELS[user.role]} · {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.defaultBranchId && (
              <span className="hidden rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-400 light:text-brand-600 ring-1 ring-brand-500/20 sm:inline-block">
                Sucursal asignada
              </span>
            )}
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
