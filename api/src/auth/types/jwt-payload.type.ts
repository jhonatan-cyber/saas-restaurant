import type { Role, SaaSRole } from '@saas/shared';

/**
 * Payload JWT base. Se usa tanto para access como refresh tokens.
 * El campo `typ` permite que las estrategias discriminen el tipo.
 * El campo `userType` discrimina entre usuarios SaaS y de negocio.
 */
export interface JwtPayload {
  /** user id */
  sub: string;
  email: string;
  /** Solo para business users */
  businessId?: string;
  /** Solo para business users */
  role?: Role;
  /** Solo para SaaS users */
  saasRole?: SaaSRole;
  /** Discriminador: 'business' (restaurant) o 'saas' (plataforma) */
  userType: 'business' | 'saas';
  /** Branch IDs accesibles por el usuario. Array vacío = todos los del business. */
  branchIds?: string[];
  /** Discriminador de tipo de token. */
  typ: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Forma del usuario autenticado que se adjunta a `req.user` por JwtStrategy.
 * Todos los campos comunes son REQUERIDOS para evitar TS errors en los
 * controllers. Las estrategias JWT setean valores dummy para SaaS users
 * en businessId/role/branchIds, y los guards (RolesGuard / SaaSRolesGuard)
 * garantizan que cada handler solo vea el tipo correcto.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: 'business' | 'saas';
  role: Role;
  /** Solo para SaaS users */
  saasRole?: SaaSRole;
  businessId: string;
  branchIds: string[];
  defaultBranchId: string | null;
}

/**
 * Contexto multi-tenant adjunto a `req.businessContext` por ScopeGuard.
 */
export interface BusinessContext {
  businessId: string;
  branchId: string | null;
}
