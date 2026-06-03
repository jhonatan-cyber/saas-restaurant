import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, type Category } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type {
  CategoryDTO,
  CategoryListItemDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '@saas/shared';
import { CreateCategoryDto, UpdateCategoryDto, type CategoryFiltersDto } from './dto/category.dto';

/**
 * CategoriesService: CRUD + reorder + soft delete.
 *
 * Multi-tenant: TODA query filtra por `businessId` del usuario.
 * Soft delete: `deletedAt` se setea en DELETE; las queries por defecto
 * lo filtran.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      data: rows.map((c) => this.toDto(c, c._count.products)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * Lista plana (sin paginación) para dropdowns.
   */
  async listAll(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { isActive?: boolean; branchId?: string },
  ): Promise<CategoryListItemDTO[]> {
    const tenant = this.prisma.tenantFilter(user, context);
    const rows = await this.prisma.category.findMany({
      where: {
        ...tenant,
        deletedAt: null,
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        branchId: true,
        isActive: true,
        displayOrder: true,
      },
    });
    return rows;
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
    return this.toDto(category, category._count.products);
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
    return this.toDto(created, 0);
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

    return this.toDto(updated, updated._count.products);
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
  }

  // ==================== HELPERS ====================

  private toDto(c: Category, productCount: number): CategoryDTO {
    return {
      id: c.id,
      businessId: c.businessId,
      branchId: c.branchId,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      productCount,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
