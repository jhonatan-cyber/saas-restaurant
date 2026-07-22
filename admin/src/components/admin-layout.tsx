import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useBranchStore } from '../lib/branch-store';
import { ROLE_LABELS, Role } from '@saas/shared';
import { ADMIN_ROUTE_ROLES } from '@saas/shared/rbac';
import { useThemeStore } from '../lib/theme-store';

// Helper local para verificar acceso
function canAccessRoute(role: string, path: string): boolean {
  const routeKey = Object.keys(ADMIN_ROUTE_ROLES).find((key) =>
    path === key || path.startsWith(`${key}/`)
  );
  if (!routeKey) return true;
  const allowed = ADMIN_ROUTE_ROLES[routeKey];
  return allowed?.includes(role as Role) ?? false;
}

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
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
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

function NavItemLink({ item, currentPath, collapsed, onClick, userRole }: {
  item: NavItem;
  currentPath: string;
  collapsed: boolean;
  onClick: () => void;
  userRole: string;
}) {
  const isActive = currentPath === item.to || currentPath.startsWith(`${item.to}/`);
  const canAccess = canAccessRoute(userRole, item.to);

  if (!canAccess) return null;

  return (
    <Link
      to={item.to as any}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-white/10 light:bg-black/5 text-white light:text-black font-semibold'
          : 'text-slate-400 light:text-slate-500 hover:bg-white/5 light:hover:bg-slate-100 hover:text-slate-200 light:hover:text-slate-700'
      }`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute inset-y-1.5 -left-3 w-0.5 rounded-full bg-white shadow-sm shadow-white/50 light:bg-black light:shadow-black/50" />
      )}

      <span className={`flex items-center justify-center transition-colors ${
        isActive ? 'text-white light:text-black' : 'text-slate-500 group-hover:text-slate-300 light:group-hover:text-slate-600'
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
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const setActiveBranchId = useBranchStore((s) => s.setActiveBranchId);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // Refresh user
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    retry: 1,
  });
  const user = me ?? storedUser;

  // Sync branch store cuando se carga el usuario
  const { syncFromUser: syncBranchFromUser } = useBranchStore();
  if (user) {
    syncBranchFromUser(user);
  }

  const location = useRouterState({ select: (s) => s.location });
  const currentPath = location.pathname;
  const { theme, toggle: toggleTheme } = useThemeStore();

  const handleLogout = (): void => {
    clear();
    useBranchStore.getState().clear();
    queryClient.clear();
    void navigate({ to: '/login' });
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 light:bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent text-white light:text-black" />
          <p className="text-sm text-slate-500">Cargando…</p>
        </div>
      </div>
    );
  }

  const initial = user.business.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen light:bg-slate-50 bg-slate-950 p-3">
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 light:bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed left-3 top-3 bottom-3 z-40 flex flex-col border transition-all duration-300 ease-in-out rounded-2xl shadow-2xl overflow-hidden ${
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white shadow-lg shadow-black/25 light:bg-slate-200 light:text-black">
              {initial}
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-base font-bold text-white shadow-lg shadow-black/25 light:bg-slate-200 light:text-black">
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
                      userRole={user.role}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* ── Content area ── */}
      <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'lg:pl-[calc(4rem+12px)]' : 'lg:pl-[calc(16rem+12px)]'}`}>
        {/* Topbar */}
        <header className="sticky top-3 z-20 flex h-16 items-center justify-between border-b border-slate-800/60 light:border-slate-200 bg-slate-900/80 light:bg-white/80 backdrop-blur-xl rounded-xl shadow-lg px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 light:hover:bg-slate-100 light:hover:text-slate-600 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 light:hover:bg-slate-100 light:hover:text-slate-600"
              title={collapsed ? 'Expandir' : 'Colapsar'}
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <CollapseIcon open={!collapsed} />
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 light:bg-slate-200 text-sm font-semibold text-slate-300 light:text-slate-600 ring-2 ring-slate-700/50 light:ring-slate-300/50 hover:ring-slate-500 transition-all"
              >
                {user.fullName.charAt(0).toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-700/60 light:border-slate-200 bg-slate-900 light:bg-white shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-2 border-b border-slate-700/60 light:border-slate-200">
                    <p className="text-sm font-medium text-white light:text-slate-900 truncate">{user.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate({ to: `/users/${user.id}` }); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 light:hover:bg-slate-100 transition-colors"
                  >
                    <UserIcon />
                    Perfil
                  </button>
                  <button
                    onClick={() => { navigate({ to: '/business' }); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 light:hover:bg-slate-100 transition-colors"
                  >
                    <SettingsIcon />
                    Configuración
                  </button>
                  <div className="border-t border-slate-700/60 light:border-slate-200 my-1" />
                  <button
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 light:hover:bg-red-100 transition-colors"
                  >
                    <LogoutIcon />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
            <div className="ml-1">
              <p className="text-sm font-semibold text-white light:text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]} · {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 light:hover:bg-slate-100 light:hover:text-slate-600"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            {user.branches.length > 1 && (
              <select
                value={activeBranchId ?? ''}
                onChange={(e) => setActiveBranchId(e.target.value || null)}
                className="hidden rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 light:border-slate-300 light:bg-white light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 sm:inline-block"
              >
                <option value="">Todas las sucursales</option>
                {user.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
            {user.branches.length === 1 && user.defaultBranchId && (
              <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 light:bg-black/5 light:text-slate-600 ring-1 ring-white/20 light:ring-black/10 sm:inline-block">
                {user.branches[0]?.name}
              </span>
            )}
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
