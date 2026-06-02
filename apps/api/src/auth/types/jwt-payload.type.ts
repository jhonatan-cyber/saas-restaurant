import type { Role } from '@saas/shared';

/**
 * Payload JWT base. Se usa tanto para access como refresh tokens.
 * El campo `typ` permite que las estrategias discriminen el tipo.
 */
export interface JwtPayload {
  /** user id */
  sub: string;
  email: string;
  businessId: string;
  role: Role;
  /** Branch IDs accesibles por el usuario. Array vacío = todos los del business. */
  branchIds: string[];
  /** Discriminador de tipo de token. */
  typ: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Forma del usuario autenticado que se adjunta a `req.user` por JwtStrategy.
 * Mantenerlo sincronizado con lo que retorna `JwtStrategy.validate`.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
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
