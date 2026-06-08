import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Supplier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { SupplierDTO, SupplierListItemDTO } from '@saas/shared';
import { toSupplierDto } from './mappers';
import { CreateSupplierDto, UpdateSupplierDto, type SupplierFiltersDto } from './dto/supplier.dto';

/**
 * SuppliersService: CRUD de proveedores con soft-delete.
 * Multi-tenant por businessId.
 */
@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: SupplierFiltersDto,
  ): Promise<PaginatedResult<SupplierDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where: Prisma.SupplierWhereInput = {
      businessId: tenant.businessId,
      deletedAt: null,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.search ? { name: { contains: filters.search } } : {}),
    };

    const cacheKey = CacheService.key('suppliers:list', { ...filters, businessId: tenant.businessId, branchId: filters.branchId ?? tenant.branchId, page, pageSize });
    const cached = await this.cache.get<PaginatedResult<SupplierDTO>>(cacheKey);
    if (cached) return cached;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: pageSize,
        include: {
          _count: { select: { purchases: true } },
        },
      }),
    ]);

    const result: PaginatedResult<SupplierDTO> = {
      data: rows.map((s) => toSupplierDto(s, s._count.purchases)),
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

  async listAll(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { isActive?: boolean; page?: number; pageSize?: number },
  ): Promise<PaginatedResult<SupplierListItemDTO>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 200;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where = {
      businessId: tenant.businessId,
      deletedAt: null,
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          contactName: true,
          phone: true,
          isActive: true,
        },
      }),
    ]);

    const result: PaginatedResult<SupplierListItemDTO> = {
      data: rows,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    // Cachear por 15s (usado en dropdowns/autocomplete)
    await this.cache.set(CacheService.key('suppliers:all', { ...filters, businessId: tenant.businessId }), result, 15);

    return result;
  }

  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<SupplierDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const supplier = await this.prisma.supplier.findFirst({
      where: { businessId: tenant.businessId, id, deletedAt: null },
      include: { _count: { select: { purchases: true } } },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return toSupplierDto(supplier, supplier._count.purchases);
  }

  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreateSupplierDto,
  ): Promise<SupplierDTO> {
    const businessId = context?.businessId ?? user.businessId;

    // Validar nombre único por (business, branch, deletedAt=null)
    const existing = await this.prisma.supplier.findFirst({
      where: {
        businessId,
        branchId: dto.branchId ?? null,
        name: dto.name,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un proveedor con ese nombre en esa sucursal');
    }

    const created = await this.prisma.supplier.create({
      data: {
        businessId,
        branchId: dto.branchId ?? null,
        name: dto.name,
        contactName: dto.contactName ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        taxId: dto.taxId ?? null,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
    });
    // Invalidar caché de proveedores
    await this.cache.delByPattern('suppliers:*');

    return toSupplierDto(created, 0);
  }

  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierDTO> {
    const businessId = context?.businessId ?? user.businessId;

    const existing = await this.prisma.supplier.findFirst({
      where: { businessId, id, deletedAt: null },
      include: { _count: { select: { purchases: true } } },
    });
    if (!existing) throw new NotFoundException('Proveedor no encontrado');

    // Validar nombre único si cambia
    if (dto.name && dto.name !== existing.name) {
      const dup = await this.prisma.supplier.findFirst({
        where: {
          businessId,
          branchId: dto.branchId ?? existing.branchId,
          name: dto.name,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Ya existe un proveedor con ese nombre en esa sucursal');
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
      },
    });
    // Invalidar caché de proveedores
    await this.cache.delByPattern('suppliers:*');

    return toSupplierDto(updated, existing._count.purchases);
  }

  async softDelete(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const businessId = context?.businessId ?? user.businessId;
    const existing = await this.prisma.supplier.findFirst({
      where: { businessId, id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Proveedor no encontrado');

    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidar caché de proveedores
    await this.cache.delByPattern('suppliers:*');
  }

  // toDto moved to ./mappers.ts — imported as toSupplierDto

}
