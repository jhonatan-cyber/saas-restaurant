import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { HEADERS } from '@saas/shared';
import type { AuthenticatedUser, BusinessContext } from '../types/jwt-payload.type';

/**
 * ScopeGuard: GARANTÍA MULTI-TENANT + FILTRO POR SUCURSAL.
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
 *     - Si el body de la request contiene `branchId`, también lo valida
 *       contra `branchIds`. Esto evita que un usuario envíe un header
 *       permitido pero cree/edite datos en una sucursal no autorizada.
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

    // ScopeGuard solo aplica a usuarios de negocio
    if (user.userType !== 'business' || !user.businessId) {
      throw new ForbiddenException('ScopeGuard solo aplica a usuarios de negocio');
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

    const resolvedBusinessId: string = user.businessId;

    // 2. Validar branch desde header
    let resolvedBranchId: string | null = null;
    const branchIds = user.branchIds ?? [];
    if (headerBranchId !== null) {
      if (headerBranchId === '') {
        // Header explícitamente vacío: cliente quiere "todas las sucursales"
        resolvedBranchId = null;
      } else {
        // branchIds vacía = acceso total; si tiene elementos, validamos inclusión
        if (branchIds.length > 0 && !branchIds.includes(headerBranchId)) {
          throw new ForbiddenException(
            `Acceso denegado: el header indica sucursal ${headerBranchId} que no está permitida para este usuario`,
          );
        }
        resolvedBranchId = headerBranchId;
      }
    }

    // 3. Validar branchId del body (defensa en profundidad: el header podría ser
    //    permitido pero el body especificar otra sucursal).
    //    Solo aplica a mutations (POST/PATCH/PUT) con body.
    const bodyBranchId = this.readBodyBranchId(request);
    if (bodyBranchId !== null && branchIds.length > 0 && !branchIds.includes(bodyBranchId)) {
      throw new ForbiddenException(
        `Acceso denegado: la sucursal ${bodyBranchId} del body no está permitida para este usuario`,
      );
    }

    // 4. Adjuntar contexto resuelto
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

  /**
   * Lee `branchId` del body de la request, si existe.
   * Soporta tanto `{ branchId: "..." }` como `{ branchId: "...", ... }`
   * en POST/PATCH/PUT.
   */
  private readBodyBranchId(req: Request): string | null {
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      ['GET', 'DELETE', 'OPTIONS', 'HEAD'].includes(req.method ?? '')
    ) {
      return null;
    }
    const body = req.body as Record<string, unknown>;
    const branchId = body?.branchId;
    if (typeof branchId === 'string' && branchId.length > 0) {
      return branchId;
    }
    return null;
  }
}
