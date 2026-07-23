import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SAAS_ROLES_KEY } from '../decorators/saas-roles.decorator';
import type { AuthenticatedUser } from '../types/jwt-payload.type';
import type { SaaSRole } from '@saas/shared';

/**
 * SaaSRolesGuard: valida que el usuario SaaS autenticado tenga uno de los
 * roles declarados con @SaaSRoles(...).
 *
 * Asume que SaaSJwtAuthGuard (o JwtAuthGuard con userType='saas') ya pobló `req.user`.
 * Solo pasa si el usuario es de tipo 'saas' y tiene el rol requerido.
 */
@Injectable()
export class SaaSRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SaaSRole[] | undefined>(SAAS_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || user.userType !== 'saas') {
      throw new ForbiddenException('Acceso solo para administradores de la plataforma');
    }

    if (!user.saasRole || !requiredRoles.includes(user.saasRole)) {
      throw new ForbiddenException(
        `Rol "${user.saasRole}" no autorizado. Se requiere uno de: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
