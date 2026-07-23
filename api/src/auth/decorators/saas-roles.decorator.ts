import { SetMetadata } from '@nestjs/common';
import type { SaaSRole } from '@saas/shared';

export const SAAS_ROLES_KEY = 'required-saas-roles';

/**
 * Especifica los roles SaaS que pueden acceder a una ruta.
 * Usar junto con `SaaSRolesGuard`.
 *
 * @example
 *   @SaaSRoles(SaaSRole.SUPER_ADMIN)
 *   @UseGuards(SaaSJwtAuthGuard, SaaSRolesGuard)
 *   getStats() { ... }
 */
export const SaaSRoles = (...roles: SaaSRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(SAAS_ROLES_KEY, roles);
