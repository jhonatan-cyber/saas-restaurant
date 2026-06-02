import { Injectable } from '@nestjs/common';
import type { Role } from '@saas/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * UsersService: operaciones básicas sobre el modelo User.
 * Phase 1 expone solo lo necesario para AuthService.
 * Phase 2+ sumará CRUD, paginación, asignación de sucursales, etc.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca un usuario por id.
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { business: true, defaultBranch: true },
    });
  }

  /**
   * Busca un usuario dentro de un tenant específico (multi-tenant).
   */
  async findByEmailInBusiness(businessId: string, email: string) {
    return this.prisma.user.findUnique({
      where: {
        businessId_email: {
          businessId,
          email: email.toLowerCase().trim(),
        },
      },
    });
  }

  /**
   * Lista usuarios de un tenant (Phase 2).
   */
  async listByBusiness(businessId: string) {
    return this.prisma.user.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Verifica si el usuario tiene alguno de los roles (Phase 2+).
   */
  hasAnyRole(userRole: Role, allowedRoles: readonly Role[]): boolean {
    return allowedRoles.includes(userRole);
  }
}
