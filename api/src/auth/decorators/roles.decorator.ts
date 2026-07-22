import { SetMetadata } from '@nestjs/common';
import type { Role } from '@saas/shared';

export const ROLES_KEY = 'required-roles';

/**
 * Especifica los roles que pueden acceder a una ruta.
 * Usar junto con `RolesGuard`.
 *
 * @example
 *   @Roles(Role.OWNER, Role.ADMIN)
 *   @UseGuards(RolesGuard)
 *   @Get('admin-stats')
 *   getStats() { ... }
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
