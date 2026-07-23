import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { useBranchStore } from '../lib/branch-store';
import { ROLE_LABELS, Role } from '@saas/shared';
import { canAccessAdminRoute } from '@saas/shared/rbac';
import { useThemeStore } from '../lib/theme-store';
import { OrbSpinner } from '@saas/ui';
import {
  DashboardIcon,
  PosIcon,
  KdsIcon,
  ReceiptIcon,
  BranchIcon,
  CashIcon,
  CashMovementIcon,
  TagIcon,
  BoxIcon,
  TruckIcon,
  PackageIcon,
  InventoryIcon,
  ReportsIcon,
  FireIcon,
  TableIcon,
  UsersIcon,
  UserManagementIcon,
  SettingsIcon,
  PlanIcon,
  AuditIcon,
  MenuIcon,
  LogoutIcon,
  CollapseIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  ChevronDownIcon,
  CheckIcon,
} from './icons';

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
  const canAccess = canAccessAdminRoute(userRole as Role, item.to);

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
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-lg ring-1 ring-white/10 group-hover:block whitespace-nowrap z-50">
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
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setBranchMenuOpen(false);
      }
    }
    if (userMenuOpen || branchMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, branchMenuOpen]);

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
          <OrbSpinner size={64} state="working" theme="auto" speed={1.25} />
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
            {NAV_GROUPS.filter((group) =>
              group.items.some((item) => canAccessAdminRoute(user.role as Role, item.to))
            ).map((group) => (
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
            <div className="relative flex items-center">
              {user.branches.length === 0 ? null : user.branches.length === 1 ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 light:bg-black/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 light:text-slate-600 ring-1 ring-white/20 light:ring-black/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  {user.branches[0]?.name}
                </span>
              ) : (
                <div className="relative" ref={branchMenuRef}>
                  <button
                    type="button"
                    onClick={() => setBranchMenuOpen(!branchMenuOpen)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white/10 light:bg-black/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 light:text-slate-600 ring-1 ring-white/20 light:ring-black/10 cursor-pointer hover:bg-white/15 light:hover:bg-black/10 transition-colors"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {user.branches.find((b) => b.id === activeBranchId)?.name ?? 'Todas las sucursales'}
                    <ChevronDownIcon className={`h-3 w-3 ml-0.5 transition-transform duration-200 ${branchMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {branchMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-700/60 light:border-slate-200 bg-slate-900 light:bg-white shadow-2xl py-1 z-50">
                      {user.branches.map((branch) => {
                        const isActive = branch.id === activeBranchId;
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => {
                              setActiveBranchId(isActive ? null : branch.id);
                              setBranchMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                              isActive
                                ? 'bg-white/10 light:bg-black/5 text-white light:text-black font-semibold'
                                : 'text-slate-300 light:text-slate-600 hover:bg-white/5 light:hover:bg-slate-100'
                            }`}
                          >
                            {isActive ? <CheckIcon /> : <span className="h-3.5 w-3.5 shrink-0" />}
                            {branch.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
