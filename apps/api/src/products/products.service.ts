import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductType, AuditAction, type Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type {
  ProductDTO,
  ProductListItemDTO,
} from '@saas/shared';
import {
  CreateProductDto,
  UpdateProductDto,
  type ProductFiltersDto,
} from './dto/product.dto';

/**
 * Tipo del producto con las relaciones que este servicio siempre carga.
 * Centralizado para mantener simple el `toDto`.
 */
type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: {
      include: { _count: { select: { products: { where: { deletedAt: null } } } } };
    };
    preparationArea: true;
  };
}>;

/**
 * Productos.
 * Multi-tenant: SIEMPRE filtra por businessId.
 * Soft delete: `deletedAt` se setea en DELETE; las queries lo filtran.
 * Auditoría: cambios de `price` se loggean vía AuditService.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Listado paginado con filtros. Excluye soft-deleted.
   */
  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: ProductFiltersDto,
  ): Promise<PaginatedResult<ProductDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where: Prisma.ProductWhereInput = {
      ...tenant,
      deletedAt: null,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.isAvailable !== undefined ? { isAvailable: filters.isAvailable } : {}),
      ...(filters.productType ? { productType: filters.productType } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search } },
              { sku: { contains: filters.search } },
              { description: { contains: filters.search } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: pageSize,
        include: {
          category: { include: { _count: { select: { products: { where: { deletedAt: null } } } } } },
          preparationArea: true,
        },
      }),
    ]);

    return {
      data: rows.map((p) => this.toDto(p)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * Listado plano para POS (sin paginación).
   * Solo productos activos y disponibles por defecto.
   */
  async listAll(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { categoryId?: string; isAvailable?: boolean },
  ): Promise<ProductListItemDTO[]> {
    const tenant = this.prisma.tenantFilter(user, context);
    const rows = await this.prisma.product.findMany({
      where: {
        ...tenant,
        deletedAt: null,
        isActive: true,
        ...(filters?.isAvailable !== undefined ? { isAvailable: filters.isAvailable } : { isAvailable: true }),
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        imageUrl: true,
        price: true,
        cost: true,
        productType: true,
        isAvailable: true,
      },
    });
    return rows.map((p) => this.toListItemDto(p));
  }

  /**
   * Productos con `minStock` configurado y `trackStock = true`.
   * Phase 2: la columna `currentStock` aún no existe (se agregará en Phase 6
   * con el módulo de inventario). Por ahora devolvemos los productos que
   * tienen `minStock` definido para que la UI pueda mostrar la sección
   * "Stock bajo" sin romper.
   *
   * TODO(phase-6): reemplazar por un check real contra `currentStock <= minStock`.
   */
  async listLowStock(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
  ): Promise<ProductListItemDTO[]> {
    const tenant = this.prisma.tenantFilter(user, context);
    const rows = await this.prisma.product.findMany({
      where: {
        ...tenant,
        deletedAt: null,
        isActive: true,
        trackStock: true,
        minStock: { not: null },
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        imageUrl: true,
        price: true,
        cost: true,
        productType: true,
        isAvailable: true,
      },
    });
    return rows.map((p) => this.toListItemDto(p));
  }

  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<ProductDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const product = await this.prisma.product.findFirst({
      where: { ...tenant, id, deletedAt: null },
      include: {
        category: {
          include: { _count: { select: { products: { where: { deletedAt: null } } } } },
        },
        preparationArea: true,
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.toDto(product);
  }

  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreateProductDto,
  ): Promise<ProductDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    // Validar slug único por business (soft-deleted NO bloquea re-creación)
    const dup = await this.prisma.product.findFirst({
      where: { ...tenant, slug: dto.slug, deletedAt: null },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Ya existe un producto con ese slug');

    // Validar que category/preparationArea pertenezcan al tenant
    await this.assertRefsBelongToTenant(user, context, {
      categoryId: dto.categoryId,
      preparationAreaId: dto.preparationAreaId,
      branchId: dto.branchId,
    });

    const created = await this.prisma.product.create({
      data: {
        ...tenant,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        preparationAreaId: dto.preparationAreaId,
        branchId: dto.branchId,
        sku: dto.sku,
        price: new Prisma.Decimal(dto.price),
        cost: dto.cost !== undefined ? new Prisma.Decimal(dto.cost) : null,
        taxRate: dto.taxRate !== undefined ? new Prisma.Decimal(dto.taxRate) : null,
        trackStock: dto.trackStock ?? false,
        minStock: dto.minStock,
        productType: dto.productType ?? 'SALE',
        preparationTimeMin: dto.preparationTimeMin,
        isActive: dto.isActive ?? true,
        isAvailable: dto.isAvailable ?? true,
      },
      include: {
        category: { include: { _count: { select: { products: { where: { deletedAt: null } } } } } },
        preparationArea: true,
      },
    });
    return this.toDto(created);
  }

  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    const existing = await this.prisma.product.findFirst({
      where: { ...tenant, id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    // Validar slug único si cambia
    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await this.prisma.product.findFirst({
        where: { ...tenant, slug: dto.slug, deletedAt: null, NOT: { id } },
        select: { id: true },
      });
      if (dup) throw new ConflictException('Ya existe un producto con ese slug');
    }

    // Validar referencias si cambian
    await this.assertRefsBelongToTenant(user, context, {
      categoryId: dto.categoryId,
      preparationAreaId: dto.preparationAreaId,
      branchId: dto.branchId,
    });

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.preparationAreaId !== undefined
          ? { preparationAreaId: dto.preparationAreaId }
          : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
        ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.cost !== undefined ? { cost: new Prisma.Decimal(dto.cost) } : {}),
        ...(dto.taxRate !== undefined ? { taxRate: new Prisma.Decimal(dto.taxRate) } : {}),
        ...(dto.trackStock !== undefined ? { trackStock: dto.trackStock } : {}),
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        ...(dto.productType !== undefined ? { productType: dto.productType } : {}),
        ...(dto.preparationTimeMin !== undefined
          ? { preparationTimeMin: dto.preparationTimeMin }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
      },
      include: {
        category: { include: { _count: { select: { products: { where: { deletedAt: null } } } } } },
        preparationArea: true,
      },
    });

    // Si cambió el precio, loggear auditoría
    if (dto.price !== undefined && !existing.price.equals(updated.price)) {
      await this.audit.log({
        businessId: user.businessId,
        userId: user.id,
      action: AuditAction.PRICE_CHANGE,
      entity: 'Product',
      entityId: updated.id,
        before: { price: existing.price.toString() },
        after: { price: updated.price.toString() },
      });
    }

    return this.toDto(updated);
  }

  async softDelete(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);
    const existing = await this.prisma.product.findFirst({
      where: { ...tenant, id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, isAvailable: false },
    });

    await this.audit.log({
      businessId: user.businessId,
      userId: user.id,
      action: AuditAction.SOFT_DELETE,
      entity: 'Product',
      entityId: id,
    });
  }

  // ==================== HELPERS ====================

  private async assertRefsBelongToTenant(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    refs: { categoryId?: string; preparationAreaId?: string; branchId?: string },
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);

    if (refs.categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: { ...tenant, id: refs.categoryId, deletedAt: null },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException('La categoría indicada no existe o no pertenece al tenant');
    }
    if (refs.preparationAreaId) {
      const area = await this.prisma.preparationArea.findFirst({
        where: { ...tenant, id: refs.preparationAreaId },
        select: { id: true },
      });
      if (!area) throw new NotFoundException('El área de preparación indicada no existe');
    }
    if (refs.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { businessId: user.businessId, id: refs.branchId },
        select: { id: true },
      });
      if (!branch) throw new NotFoundException('La sucursal indicada no existe');
    }
  }

  private toListItemDto(p: {
    id: string;
    name: string;
    slug: string;
    categoryId: string | null;
    imageUrl: string | null;
    price: Prisma.Decimal;
    cost: Prisma.Decimal | null;
    productType: ProductType;
    isAvailable: boolean;
  }): ProductListItemDTO {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryId: p.categoryId,
      imageUrl: p.imageUrl,
      price: p.price.toString(),
      cost: p.cost?.toString() ?? null,
      productType: p.productType,
      isAvailable: p.isAvailable,
    };
  }

  private toDto(p: ProductWithRelations): ProductDTO {
    return {
      id: p.id,
      businessId: p.businessId,
      branchId: p.branchId,
      categoryId: p.categoryId,
      preparationAreaId: p.preparationAreaId,
      name: p.name,
      slug: p.slug,
      description: p.description,
      imageUrl: p.imageUrl,
      sku: p.sku,
      price: p.price.toString(),
      cost: p.cost ? p.cost.toString() : null,
      taxRate: p.taxRate ? p.taxRate.toString() : null,
      isActive: p.isActive,
      isAvailable: p.isAvailable,
      minStock: p.minStock,
      trackStock: p.trackStock,
      currentStock: p.currentStock.toString(),
      productType: p.productType,
      preparationTimeMin: p.preparationTimeMin,
      category: p.category
        ? {
            id: p.category.id,
            businessId: p.category.businessId,
            branchId: p.category.branchId,
            name: p.category.name,
            slug: p.category.slug,
            description: p.category.description,
            imageUrl: p.category.imageUrl,
            displayOrder: p.category.displayOrder,
            isActive: p.category.isActive,
            productCount: p.category._count.products,
            createdAt: p.category.createdAt.toISOString(),
            updatedAt: p.category.updatedAt.toISOString(),
          }
        : null,
      preparationArea: p.preparationArea
        ? {
            id: p.preparationArea.id,
            businessId: p.preparationArea.businessId,
            branchId: p.preparationArea.branchId,
            name: p.preparationArea.name,
            code: p.preparationArea.code,
            description: p.preparationArea.description,
            isActive: p.preparationArea.isActive,
            displayOrder: p.preparationArea.displayOrder,
            createdAt: p.preparationArea.createdAt.toISOString(),
            updatedAt: p.preparationArea.updatedAt.toISOString(),
          }
        : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
