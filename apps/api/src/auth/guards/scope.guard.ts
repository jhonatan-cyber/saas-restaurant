import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { HEADERS } from '@saas/shared';
import type { AuthenticatedUser, BusinessContext } from '../types/jwt-payload.type';

/**
 * ScopeGuard: GARANTÍA MULTI-TENANT.
 *
 * Responsabilidad:
 *  1. Lee el payload JWT (puesto por JwtAuthGuard en `req.user`).
 *  2. Lee los headers `x-business-id` y `x-branch-id` de la request.
 *  3. Valida:
 *     - Si viene `x-business-id`, debe coincidir con el `businessId` del JWT.
 *       (Defensa en profundidad: aunque un cliente envíe un header con un
 *       business ajeno, el JWT manda).
 *     - Si viene `x-branch-id`, debe estar en la lista de `branchIds` del
 *       JWT (si la lista está vacía, el usuario tiene acceso a TODAS las
 *       sucursales del business).
 *  4. Si el cliente NO envía headers, usa el contexto del propio JWT.
 *  5. Adjunta `req.businessContext = { businessId, branchId }` para que
 *     los servicios downstream tengan el contexto resuelto.
 *
 * Aplicar con `@UseGuards(ScopeGuard)` en controllers/rutas que operen
 * sobre datos tenant-scoped.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      Request & { user?: AuthenticatedUser; businessContext?: BusinessContext }
    >();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('ScopeGuard requiere un usuario autenticado');
    }

    // Headers: toleramos que no vengan; en ese caso usamos el JWT.
    const headerBusinessId = this.readHeader(request, HEADERS.BUSINESS_ID);
    const headerBranchId = this.readHeader(request, HEADERS.BRANCH_ID);

    // 1. Validar business
    if (headerBusinessId && headerBusinessId !== user.businessId) {
      throw new ForbiddenException(
        `Acceso denegado: el header ${HEADERS.BUSINESS_ID} no coincide con el tenant del token`,
      );
    }

    const resolvedBusinessId = user.businessId;

    // 2. Validar branch
    let resolvedBranchId: string | null = null;
    if (headerBranchId !== null) {
      if (headerBranchId === '') {
        // Header explícitamente vacío: cliente quiere "todas las sucursales"
        resolvedBranchId = null;
      } else {
        // branchIds vacía = acceso total; si tiene elementos, validamos inclusión
        if (user.branchIds.length > 0 && !user.branchIds.includes(headerBranchId)) {
          throw new ForbiddenException(
            `Acceso denegado: la sucursal ${headerBranchId} no está permitida para este usuario`,
          );
        }
        resolvedBranchId = headerBranchId;
      }
    }

    // 3. Adjuntar contexto resuelto
    request.businessContext = {
      businessId: resolvedBusinessId,
      branchId: resolvedBranchId,
    };

    return true;
  }

  private readHeader(req: Request, name: string): string | null {
    const value = req.headers[name.toLowerCase()];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
    return null;
  }
}
