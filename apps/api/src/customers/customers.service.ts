import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Customer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { CustomerDTO } from '@saas/shared';
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
  constructor(private readonly prisma: PrismaService) {}

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
              { name: { contains: filters.search, mode: 'insensitive' as const } },
              { taxId: { contains: filters.search, mode: 'insensitive' as const } },
              { email: { contains: filters.search, mode: 'insensitive' as const } },
              { phone: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((c) => this.toDto(c)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
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
    if (trimmed.length === 0) {
      // Si no hay query, devuelve los últimos 20 clientes activos
      const rows = await this.prisma.customer.findMany({
        where: { ...tenant, deletedAt: null, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 50),
      });
      return rows.map((c) => this.toDto(c));
    }
    const rows = await this.prisma.customer.findMany({
      where: {
        ...tenant,
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' as const } },
          { taxId: { contains: trimmed, mode: 'insensitive' as const } },
          { email: { contains: trimmed, mode: 'insensitive' as const } },
          { phone: { contains: trimmed, mode: 'insensitive' as const } },
        ],
      },
      orderBy: [{ name: 'asc' }],
      take: Math.min(limit, 50),
    });
    return rows.map((c) => this.toDto(c));
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
    return this.toDto(customer);
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
    return this.toDto(created);
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
    return this.toDto(updated);
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
  }

  private toDto(c: Customer): CustomerDTO {
    return {
      id: c.id,
      businessId: c.businessId,
      name: c.name,
      taxId: c.taxId,
      taxIdType: c.taxIdType,
      email: c.email,
      phone: c.phone,
      address: c.address,
      addressReference: c.addressReference,
      latitude: c.latitude ? c.latitude.toString() : null,
      longitude: c.longitude ? c.longitude.toString() : null,
      notes: c.notes,
      isActive: c.isActive,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent.toString(),
      lastOrderAt: c.lastOrderAt ? c.lastOrderAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
