import type { Role } from './enums';
import { Role as RoleEnum } from './enums';

/**
 * Permisos de navegación del admin por ruta base.
 * Debe alinearse con @Roles en los controllers del API.
 */
export const ADMIN_ROUTE_ROLES: Record<string, readonly Role[]> = {
  '/dashboard': [
    RoleEnum.OWNER,
    RoleEnum.ADMIN,
    RoleEnum.CAJERO,
    RoleEnum.MESERO,
    RoleEnum.COCINA,
    RoleEnum.REPARTIDOR,
  ],
  '/pos': [RoleEnum.OWNER, RoleEnum.ADMIN, RoleEnum.CAJERO, RoleEnum.MESERO],
  '/kds': [RoleEnum.OWNER, RoleEnum.ADMIN, RoleEnum.COCINA],
  '/orders': [
    RoleEnum.OWNER,
    RoleEnum.ADMIN,
    RoleEnum.CAJERO,
    RoleEnum.MESERO,
    RoleEnum.COCINA,
    RoleEnum.REPARTIDOR,
  ],
  '/branches': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/cash': [RoleEnum.OWNER, RoleEnum.ADMIN, RoleEnum.CAJERO],
  '/cash-movements': [RoleEnum.OWNER, RoleEnum.ADMIN, RoleEnum.CAJERO],
  '/categories': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/products': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/suppliers': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/purchases': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/inventory': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/reports': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/preparation-areas': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/tables': [
    RoleEnum.OWNER,
    RoleEnum.ADMIN,
    RoleEnum.CAJERO,
    RoleEnum.MESERO,
  ],
  '/customers': [
    RoleEnum.OWNER,
    RoleEnum.ADMIN,
    RoleEnum.CAJERO,
    RoleEnum.MESERO,
  ],
  '/users': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/business': [RoleEnum.OWNER, RoleEnum.ADMIN],
  '/plans': [] as Role[],
  '/audit': [RoleEnum.OWNER, RoleEnum.ADMIN],
} as const;

/** Features de plan disponibles en seed y UI. */
export const PLAN_FEATURE_OPTIONS = [
  { code: 'pos_web', label: 'POS Web' },
  { code: 'reports', label: 'Reportes' },
  { code: 'inventory', label: 'Inventario' },
  { code: 'kds', label: 'Cocina (KDS)' },
  { code: 'multi_branch', label: 'Multi-sucursal' },
  { code: 'mobile_app', label: 'App Móvil' },
  { code: 'pos_stations', label: 'Estaciones POS' },
] as const;

export type PlanFeatureCode = (typeof PLAN_FEATURE_OPTIONS)[number]['code'];

/** Normaliza pathname (soporta base `/app/` de Vite). */
export function normalizeAdminPath(pathname: string): string {
  const stripped = pathname.replace(/^\/app/, '') || '/';
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/** Resuelve la ruta base registrada en ADMIN_ROUTE_ROLES. */
export function resolveAdminRouteKey(pathname: string): string | null {
  const normalized = normalizeAdminPath(pathname);
  const keys = Object.keys(ADMIN_ROUTE_ROLES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (normalized === key || normalized.startsWith(`${key}/`)) {
      return key;
    }
  }
  return null;
}

export function canAccessAdminRoute(role: Role, pathname: string): boolean {
  const routeKey = resolveAdminRouteKey(pathname);
  if (!routeKey) return true;
  const allowed = ADMIN_ROUTE_ROLES[routeKey];
  return allowed?.includes(role) ?? false;
}

export function getAdminNavRoutes(): string[] {
  return Object.keys(ADMIN_ROUTE_ROLES);
}
