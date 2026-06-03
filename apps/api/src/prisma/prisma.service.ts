import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';

/**
 * Servicio de Prisma.
 * - Implementa los hooks de NestJS para conectar/desconectar
 *   automáticamente cuando arranca o se destruye la app.
 * - Loggea queries solo en desarrollo (cambiar según necesidad).
 * - Expone `tenantFilter(user)` para garantizar que CADA query incluya
 *   el `businessId` resuelto por el ScopeGuard. Es la pieza más importante
 *   de la multi-tenancy: una query sin este filtro es un bug.
 *
 * Prisma 7: usa driver adapter `@prisma/adapter-mariadb` (driver `mariadb`)
 * porque Prisma 7 removió el motor interno (Rust engine) y la conexión
 * la maneja el adapter nativo de Node.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    // Con driver adapter, $connect() es opcional (el adapter maneja el pool).
    // Llamamos $connect() para validar conectividad al arrancar.
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
   * Importante: `branchId` se omite (no se setea como `null`) para que
   * `Prisma.{Model}WhereInput` (donde el campo es opcional) no rechace
   * `string | null` cuando el contexto no tiene branch resuelto.
   *
   * @example
   *   await prisma.category.findMany({
   *     where: { ...prisma.tenantFilter(user), deletedAt: null },
   *   });
   */
  tenantFilter(
    user: AuthenticatedUser,
    context?: BusinessContext,
  ): { businessId: string; branchId?: string } {
    const branchId = context?.branchId;
    return {
      businessId: context?.businessId ?? user.businessId,
      ...(branchId ? { branchId } : {}),
    };
  }
}
