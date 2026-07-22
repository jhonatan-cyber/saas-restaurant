import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, type Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { QuotaEnforcer } from '../billing/quota.enforcer';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type {
  CategoryDTO,
  CategoryListItemDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '@saas/shared';
import { CreateCategoryDto, UpdateCategoryDto, type CategoryFiltersDto } from './dto/category.dto';
import { toCategoryDto } from './mappers';

/**
 * CategoriesService: CRUD + reorder + soft delete.
 *
 * Multi-tenant: TODA query filtra por `businessId` del usuario.
 * Soft delete: `deletedAt` se setea en DELETE; las queries por defecto
 * lo filtran.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly quota: QuotaEnforcer,
  ) {}

  /**
   * Lista paginada con filtros. Excluye soft-deleted.
   * Incluye `productCount` por categoría.
   */
  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: CategoryFiltersDto,
  ): Promise<PaginatedResult<CategoryDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const tenant = this.prisma.tenantFilter(user, context);

    const where: Prisma.CategoryWhereInput = {
      ...tenant,
      deletedAt: null,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.search
        ? { name: { contains: filters.search } }
        : {}),
    };

    const cacheKey = CacheService.key('categories:list', { ...filters, businessId: tenant.businessId, branchId: filters.branchId ?? tenant.branchId, page, pageSize });
    const cached = await this.cache.get<PaginatedResult<CategoryDTO>>(cacheKey);
    if (cached) return cached;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              products: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);

    const result: PaginatedResult<CategoryDTO> = {
      data: rows.map((c) => toCategoryDto(c, c._count.products)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    // Cachear por 30s (los catálogos cambian poco)
    await this.cache.set(cacheKey, result, 30);

    return result;
  }

  /**
   * Lista plana (sin paginación) para dropdowns.
   */
  async listAll(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { isActive?: boolean; branchId?: string; page?: number; pageSize?: number },
  ): Promise<PaginatedResult<CategoryListItemDTO>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 200;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where = {
      ...tenant,
      deletedAt: null,
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters?.branchId ? { branchId: filters.branchId } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          branchId: true,
          isActive: true,
          displayOrder: true,
        },
      }),
    ]);

    const result: PaginatedResult<CategoryListItemDTO> = {
      data: rows,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    // Cachear por 15s (usado constantemente en dropdowns/POS)
    await this.cache.set(CacheService.key('categories:all', { ...filters, businessId: tenant.businessId, branchId: filters?.branchId ?? tenant.branchId }), result, 15);
    return result;
  }

  /**
   * Detalle. Lanza 404 si no existe o está soft-deleted.
   */
  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<CategoryDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const category = await this.prisma.category.findFirst({
      where: { ...tenant, id, deletedAt: null },
      include: {
        _count: {
          select: {
            products: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return toCategoryDto(category, category._count.products);
  }

  /**
   * Crea una categoría. Valida unicidad de slug por (business, branch, deletedAt=null).
   */
  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreateCategoryDto,
  ): Promise<CategoryDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    // Verificar cuota de categorías del plan
    await this.quota.checkOrThrow(tenant.businessId, 'categories');

    // Validación de slug único (a nivel de aplicación porque MySQL trata
    // NULL como DISTINTO en unique compuesto, ver nota en schema).
    const existing = await this.prisma.category.findFirst({
      where: {
        ...tenant,
        branchId: dto.branchId ?? null,
        slug: dto.slug,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese slug en esa sucursal');
    }

    const created = await this.prisma.category.create({
      data: {
        ...tenant,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        displayOrder: dto.displayOrder ?? 0,
        branchId: dto.branchId ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    // Invalidar caché de categorías
    await this.cache.delByPattern('categories:*');

    return toCategoryDto(created, 0);
  }

  /**
   * Actualiza campos de la categoría.
   */
  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    // Verifica existencia (incluye soft-deleted para que el 404 sea claro)
    const existing = await this.prisma.category.findFirst({
      where: { ...tenant, id, deletedAt: null },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    });
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Si cambia el slug, validar unicidad
    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await this.prisma.category.findFirst({
        where: {
          ...tenant,
          branchId: dto.branchId ?? existing.branchId,
          slug: dto.slug,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Ya existe una categoría con ese slug en esa sucursal');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    // Invalidar caché de categorías
    await this.cache.delByPattern('categories:*');

    return toCategoryDto(updated, updated._count.products);
  }

  /**
   * Reordena varias categorías en una transacción.
   */
  async reorder(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    items: { id: string; displayOrder: number }[],
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.category.updateMany({
          where: { ...tenant, id: item.id, deletedAt: null },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );

    // Invalidar caché de categorías (displayOrder afecta el listado)
    await this.cache.delByPattern('categories:*');
  }

  /**
   * Soft delete. Bloquea si tiene productos activos asociados.
   */
  async softDelete(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);

    const existing = await this.prisma.category.findFirst({
      where: { ...tenant, id, deletedAt: null },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    });
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (existing._count.products > 0) {
      throw new ConflictException(
        `No se puede eliminar: la categoría tiene ${existing._count.products} producto(s) activo(s). ` +
          `Elimina o reasigna los productos primero.`,
      );
    }

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidar caché de categorías
    await this.cache.delByPattern('categories:*');
  }

  // ==================== HELPERS ====================

  // toDto moved to ./mappers.ts — imported as toCategoryDto

}
