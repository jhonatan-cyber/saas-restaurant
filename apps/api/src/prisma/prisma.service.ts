import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';

/**
 * Servicio de Prisma.
 * - Implementa los hooks de NestJS para conectar/desconectar
 *   automáticamente cuando arranca o se destruye la app.
 * - Loggea queries solo en desarrollo (cambiar según necesidad).
 * - Expone `tenantFilter(user)` para garantizar que CADA query incluya
 *   el `businessId` resuelto por el ScopeGuard. Es la pieza más importante
 *   de la multi-tenancy: una query sin este filtro es un bug.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ Prisma conectado a la base de datos');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('👋 Prisma desconectado');
  }

  /**
   * Devuelve el filtro mínimo obligatorio para que una query respete
   * el tenant. SIEMPRE incluye `businessId` (Phase 2: tenant raíz).
   * Si la request trajo un branch context resuelto, también lo agrega.
   *
   * @example
   *   await prisma.category.findMany({
   *     where: { ...prisma.tenantFilter(user), deletedAt: null },
   *   });
   */
  tenantFilter(
    user: AuthenticatedUser,
    context?: BusinessContext,
  ): { businessId: string; branchId?: string | null } {
    return {
      businessId: context?.businessId ?? user.businessId,
      ...(context?.branchId !== undefined ? { branchId: context.branchId } : {}),
    };
  }
}
