import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Extrae el usuario autenticado (adjuntado por JwtStrategy a `req.user`)
 * y lo inyecta como parámetro del handler.
 *
 * @example
 *   @Get('me')
 *   getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 *   // O un campo específico:
 *   getMe(@CurrentUser('businessId') businessId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return field ? user[field] : user;
  },
);
