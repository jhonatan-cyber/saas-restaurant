import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, BranchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { QuotaEnforcer } from '../billing/quota.enforcer';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { BranchDTO } from '@saas/shared';
import { CreateBranchDto, UpdateBranchDto, type BranchFiltersDto } from './dto/branch.dto';
import { toBranchDto } from './mappers';

/**
 * BranchesService: CRUD + activación/desactivación.
 *
 * Multi-tenant: TODA query filtra por `businessId` del usuario.
 * Branch NO tiene soft-delete (no tiene campo `deletedAt`).
 * En lugar de eliminar, se marca como INACTIVE.
 * Antes de desactivar, verifica que no tenga dependencias activas
 * (órdenes en progreso, cajas abiertas, etc.).
 */
@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly quota: QuotaEnforcer,
  ) {}

  /**
   * Lista paginada con filtros.
   */
  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: BranchFiltersDto,
  ): Promise<PaginatedResult<BranchDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const tenant = this.prisma.tenantFilter(user, context);

    const where: Prisma.BranchWhereInput = {
      businessId: tenant.businessId,
      ...(filters.isActive !== undefined
        ? { status: filters.isActive ? ('ACTIVE' as BranchStatus) : ('INACTIVE' as BranchStatus) }
        : {}),
      ...(filters.search
        ? { name: { contains: filters.search } }
        : {}),
    };

    const cacheKey = CacheService.key('branches:list', { ...filters, businessId: tenant.businessId, page, pageSize });
    const cached = await this.cache.get<PaginatedResult<BranchDTO>>(cacheKey);
    if (cached) return cached;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
        where,
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              categories: { where: { deletedAt: null } },
              products: { where: { deletedAt: null } },
              tables: { where: { deletedAt: null } },
              orders: { where: { status: { notIn: ['PAID', 'CANCELLED'] } } },
              cashRegisters: { where: { status: 'OPEN' } },
              shifts: { where: { status: 'OPEN' } },
              posStations: { where: { isActive: true } },
            },
          },
        },
      }),
    ]);

    const result: PaginatedResult<BranchDTO> = {
      data: rows.map((b) => toBranchDto(b, b._count)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    // Cachear por 30s
    await this.cache.set(cacheKey, result, 30);

    return result;
  }

  /**
   * Lista plana para dropdowns (sin paginación).
   */
  async listAll(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { isActive?: boolean; page?: number; pageSize?: number },
  ): Promise<PaginatedResult<{ id: string; name: string; code: string; isMain: boolean; status: string }>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 200;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where = {
      businessId: tenant.businessId,
      ...(filters?.isActive !== undefined
        ? { status: filters.isActive ? ('ACTIVE' as BranchStatus) : ('INACTIVE' as BranchStatus) }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.branch.count({ where }),
      this.prisma.branch.findMany({
        where,
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          code: true,
          isMain: true,
          status: true,
        },
      }),
    ]);

    const result: PaginatedResult<{ id: string; name: string; code: string; isMain: boolean; status: string }> = {
      data: rows,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    // Cachear por 15s (usado en dropdowns)
    await this.cache.set(CacheService.key('branches:all', { ...filters, businessId: tenant.businessId }), result, 15);

    return result;
  }

  /**
   * Detalle de una sucursal.
   */
  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<BranchDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const branch = await this.prisma.branch.findFirst({
      where: { businessId: tenant.businessId, id },
      include: {
        _count: {
          select: {
            categories: { where: { deletedAt: null } },
            products: { where: { deletedAt: null } },
            tables: { where: { deletedAt: null } },
            orders: { where: { status: { notIn: ['PAID', 'CANCELLED'] } } },
            cashRegisters: { where: { status: 'OPEN' } },
            shifts: { where: { status: 'OPEN' } },
            posStations: { where: { isActive: true } },
          },
        },
      },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    return toBranchDto(branch, branch._count);
  }

  /**
   * Crea una sucursal. Valida unicidad de código por business.
   */
  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreateBranchDto,
  ): Promise<BranchDTO> {
    const businessId = context?.businessId ?? user.businessId;

    // Verificar cuota de sucursales del plan
    await this.quota.checkOrThrow(businessId, 'branches');

    // Validar código único por business
    const existing = await this.prisma.branch.findFirst({
      where: { businessId, code: dto.code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una sucursal con ese código');
    }

    // Si es la primera sucursal o se marca como isMain, resetear otras
    if (dto.isMain) {
      await this.prisma.branch.updateMany({
        where: { businessId, isMain: true },
        data: { isMain: false },
      });
    }

    // Si no se especifica y no hay sucursales, que sea la principal por defecto
    const branchCount = await this.prisma.branch.count({ where: { businessId } });
    const isMain = dto.isMain ?? branchCount === 0;

    const created = await this.prisma.branch.create({
      data: {
        businessId,
        name: dto.name,
        code: dto.code,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        isMain,
      },
    });

    // Invalidar caché de sucursales
    await this.cache.delByPattern('branches:*');

    return toBranchDto(created, {
      categories: 0,
      products: 0,
      tables: 0,
      orders: 0,
      cashRegisters: 0,
      shifts: 0,
      posStations: 0,
    });
  }

  /**
   * Actualiza campos de la sucursal.
   */
  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdateBranchDto,
  ): Promise<BranchDTO> {
    const businessId = context?.businessId ?? user.businessId;

    // Verificar existencia
    const existing = await this.prisma.branch.findFirst({
      where: { businessId, id },
    });
    if (!existing) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    // Si cambia el código, validar unicidad
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.branch.findFirst({
        where: { businessId, code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Ya existe una sucursal con ese código');
      }
    }

    // Si se marca como principal, resetear otras
    if (dto.isMain) {
      await this.prisma.branch.updateMany({
        where: { businessId, isMain: true, NOT: { id } },
        data: { isMain: false },
      });
    }

    // Si se desactiva, verificar que no tenga dependencias activas
    if (dto.status === 'INACTIVE' && existing.status === 'ACTIVE') {
      await this.ensureNoActiveDependencies(businessId, id);
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.isMain !== undefined ? { isMain: dto.isMain } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        _count: {
          select: {
            categories: { where: { deletedAt: null } },
            products: { where: { deletedAt: null } },
            tables: { where: { deletedAt: null } },
            orders: { where: { status: { notIn: ['PAID', 'CANCELLED'] } } },
            cashRegisters: { where: { status: 'OPEN' } },
            shifts: { where: { status: 'OPEN' } },
            posStations: { where: { isActive: true } },
          },
        },
      },
    });

    // Invalidar caché de sucursales
    await this.cache.delByPattern('branches:*');

    return toBranchDto(updated, updated._count);
  }

  /**
   * Desactiva una sucursal (no se puede hard-delete por FK constraints).
   * Bloquea si tiene dependencias activas.
   */
  async deactivate(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const businessId = context?.businessId ?? user.businessId;

    const existing = await this.prisma.branch.findFirst({
      where: { businessId, id },
    });
    if (!existing) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    if (existing.status === 'INACTIVE') {
      return; // ya está inactiva, no-op
    }

    await this.ensureNoActiveDependencies(businessId, id);

    await this.prisma.branch.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // Invalidar caché de sucursales
    await this.cache.delByPattern('branches:*');
  }

  /**
   * Reactiva una sucursal.
   */
  async reactivate(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const businessId = context?.businessId ?? user.businessId;

    const existing = await this.prisma.branch.findFirst({
      where: { businessId, id },
    });
    if (!existing) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    await this.prisma.branch.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    // Invalidar caché de sucursales
    await this.cache.delByPattern('branches:*');
  }

  // ==================== HELPERS ====================

  /**
   * Verifica que la sucursal no tenga dependencias activas antes de desactivar.
   */
  private async ensureNoActiveDependencies(businessId: string, branchId: string): Promise<void> {
    const counts = await this.prisma.branch.findFirst({
      where: { businessId, id: branchId },
      select: {
        _count: {
          select: {
            categories: { where: { deletedAt: null, isActive: true } },
            products: { where: { deletedAt: null, isActive: true } },
            tables: { where: { deletedAt: null } },
            orders: { where: { status: { notIn: ['PAID', 'CANCELLED'] } } },
            cashRegisters: { where: { status: 'OPEN' } },
            shifts: { where: { status: 'OPEN' } },
            posStations: { where: { isActive: true } },
          },
        },
      },
    });

    if (!counts) return;

    const deps: string[] = [];
    if (counts._count.categories > 0) deps.push(`${counts._count.categories} categoría(s) activa(s)`);
    if (counts._count.products > 0) deps.push(`${counts._count.products} producto(s) activo(s)`);
    if (counts._count.tables > 0) deps.push(`${counts._count.tables} mesa(s)`);
    if (counts._count.orders > 0) deps.push(`${counts._count.orders} orden(es) en progreso`);
    if (counts._count.cashRegisters > 0) deps.push(`${counts._count.cashRegisters} caja(s) abierta(s)`);
    if (counts._count.shifts > 0) deps.push(`${counts._count.shifts} turno(s) abierto(s)`);
    if (counts._count.posStations > 0) deps.push(`${counts._count.posStations} estación(es) POS activa(s)`);

    if (deps.length > 0) {
      throw new ConflictException(
        `No se puede desactivar la sucursal: tiene dependencias activas:\n${deps.join('\n')}`,
      );
    }
  }

  // toDto moved to ./mappers.ts — imported as toBranchDto

}
