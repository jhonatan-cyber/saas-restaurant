import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/jwt-payload.type';
import type { Role } from '@saas/shared';

/**
 * RolesGuard: valida que el usuario autenticado tenga uno de los roles
 * declarados con @Roles(...).
 *
 * Asume que JwtAuthGuard ya pobló `req.user`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Rol "${user.role}" no autorizado. Se requiere uno de: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
