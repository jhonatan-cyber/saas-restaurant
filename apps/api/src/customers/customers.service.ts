import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Customer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { CustomerDTO } from '@saas/shared';
import { toCustomerDto } from './mappers';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  type CustomerFiltersDto,
} from './dto/customer.dto';

/**
 * Clientes del business.
 * Cualquier usuario autenticado puede listar / crear (meseros registran
 * walk-ins en el POS). Escritura completa: OWNER/ADMIN (RolesGuard).
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: CustomerFiltersDto,
  ): Promise<PaginatedResult<CustomerDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where: Prisma.CustomerWhereInput = {
      ...tenant,
      deletedAt: null,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search } },
              { taxId: { contains: filters.search } },
              { email: { contains: filters.search } },
              { phone: { contains: filters.search } },
            ],
          }
        : {}),
    };

    const cacheKey = CacheService.key('customers:list', { ...filters, businessId: tenant.businessId, page, pageSize });
    const cached = await this.cache.get<PaginatedResult<CustomerDTO>>(cacheKey);
    if (cached) return cached;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    const result: PaginatedResult<CustomerDTO> = {
      data: rows.map((c) => toCustomerDto(c)),
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
   * Búsqueda liviana (sin paginación, máximo 50) para autocomplete del POS.
   */
  async search(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    query: string,
    limit = 20,
  ): Promise<CustomerDTO[]> {
    const tenant = this.prisma.tenantFilter(user, context);
    const trimmed = query?.trim() ?? '';
    const searchLimit = Math.min(limit, 50);

    const cacheKey = CacheService.key('customers:search', { query: trimmed, limit: searchLimit, businessId: tenant.businessId });
    const cached = await this.cache.get<CustomerDTO[]>(cacheKey);
    if (cached) return cached;

    let rows: Customer[];
    if (trimmed.length === 0) {
      // Si no hay query, devuelve los últimos clientes activos
      rows = await this.prisma.customer.findMany({
        where: { ...tenant, deletedAt: null, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: searchLimit,
      });
    } else {
      rows = await this.prisma.customer.findMany({
        where: {
          ...tenant,
          deletedAt: null,
          isActive: true,
          OR: [
            { name: { contains: trimmed } },
            { taxId: { contains: trimmed } },
            { email: { contains: trimmed } },
            { phone: { contains: trimmed } },
          ],
        },
        orderBy: [{ name: 'asc' }],
        take: searchLimit,
      });
    }

    const result = rows.map((c) => toCustomerDto(c));
    // Cachear búsqueda por 15s (usado en autocomplete del POS)
    await this.cache.set(cacheKey, result, 15);
    return result;
  }

  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<CustomerDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const customer = await this.prisma.customer.findFirst({
      where: { ...tenant, id, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return toCustomerDto(customer);
  }

  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreateCustomerDto,
  ): Promise<CustomerDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    const created = await this.prisma.customer.create({
      data: {
        ...tenant,
        name: dto.name,
        taxId: dto.taxId,
        taxIdType: dto.taxIdType,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        addressReference: dto.addressReference,
        latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : null,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
    // Invalidar caché de clientes
    await this.cache.delByPattern('customers:*');

    return toCustomerDto(created);
  }

  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    const existing = await this.prisma.customer.findFirst({
      where: { ...tenant, id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Cliente no encontrado');

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
        ...(dto.taxIdType !== undefined ? { taxIdType: dto.taxIdType } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.addressReference !== undefined
          ? { addressReference: dto.addressReference }
          : {}),
        ...(dto.latitude !== undefined
          ? { latitude: new Prisma.Decimal(dto.latitude) }
          : {}),
        ...(dto.longitude !== undefined
          ? { longitude: new Prisma.Decimal(dto.longitude) }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    // Invalidar caché de clientes
    await this.cache.delByPattern('customers:*');

    return toCustomerDto(updated);
  }

  async softDelete(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);
    const existing = await this.prisma.customer.findFirst({
      where: { ...tenant, id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Cliente no encontrado');

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidar caché de clientes
    await this.cache.delByPattern('customers:*');
  }

  // toDto moved to ./mappers.ts — imported as toCustomerDto

}
