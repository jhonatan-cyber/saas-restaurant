import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { BusinessContext } from '../types/jwt-payload.type';

/**
 * Extrae el contexto multi-tenant adjunto por `ScopeGuard` a `req.businessContext`.
 * Si el guard no corrió (no debería pasar en endpoints tenant-scoped), devuelve undefined.
 *
 * @example
 *   @Get()
 *   list(@BusinessContext() ctx: BusinessContext) {
 *     // ctx.businessId, ctx.branchId (puede ser null)
 *   }
 */
export const BusinessContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BusinessContext | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { businessContext?: BusinessContext }>();
    return request.businessContext;
  },
);
