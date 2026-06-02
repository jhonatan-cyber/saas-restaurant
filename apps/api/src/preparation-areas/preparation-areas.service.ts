import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PreparationArea } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type {
  PreparationAreaDTO,
  PreparationAreaListItemDTO,
} from '@saas/shared';
import {
  CreatePreparationAreaDto,
  UpdatePreparationAreaDto,
  type PreparationAreaFiltersDto,
} from './dto/preparation-area.dto';

/**
 * PreparationAreasService: gestión de "cocinas" o "estaciones" del negocio.
 * Una preparación agrupa productos para que la comanda sepa a qué área
 * derivar la impresión (cocina, bar, cafetería, etc).
 */
@Injectable()
export class PreparationAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: PreparationAreaFiltersDto,
  ): Promise<PaginatedResult<PreparationAreaDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where: Prisma.PreparationAreaWhereInput = {
      ...tenant,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.preparationArea.count({ where }),
      this.prisma.preparationArea.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
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

  async listAll(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { isActive?: boolean; branchId?: string },
  ): Promise<PreparationAreaListItemDTO[]> {
    const tenant = this.prisma.tenantFilter(user, context);
    return this.prisma.preparationArea.findMany({
      where: {
        ...tenant,
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        branchId: true,
        isActive: true,
        displayOrder: true,
      },
    });
  }

  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<PreparationAreaDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const area = await this.prisma.preparationArea.findFirst({
      where: { ...tenant, id },
    });
    if (!area) throw new NotFoundException('Área de preparación no encontrada');
    return this.toDto(area);
  }

  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreatePreparationAreaDto,
  ): Promise<PreparationAreaDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    const dup = await this.prisma.preparationArea.findFirst({
      where: { ...tenant, branchId: dto.branchId ?? null, code: dto.code },
      select: { id: true },
    });
    if (dup) {
      throw new ConflictException('Ya existe un área de preparación con ese código en esa sucursal');
    }

    const created = await this.prisma.preparationArea.create({
      data: {
        ...tenant,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        branchId: dto.branchId ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toDto(created);
  }

  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdatePreparationAreaDto,
  ): Promise<PreparationAreaDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    const existing = await this.prisma.preparationArea.findFirst({
      where: { ...tenant, id },
    });
    if (!existing) throw new NotFoundException('Área de preparación no encontrada');

    if (dto.code && dto.code !== existing.code) {
      const dup = await this.prisma.preparationArea.findFirst({
        where: {
          ...tenant,
          branchId: existing.branchId,
          code: dto.code,
          NOT: { id },
        },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Ya existe un área con ese código en esa sucursal');
      }
    }

    const updated = await this.prisma.preparationArea.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.toDto(updated);
  }

  async reorder(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    items: { id: string; displayOrder: number }[],
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.preparationArea.updateMany({
          where: { ...tenant, id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );
  }

  /**
   * Hard delete. Bloquea si hay productos referenciándola.
   */
  async hardDelete(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);

    const existing = await this.prisma.preparationArea.findFirst({
      where: { ...tenant, id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new NotFoundException('Área de preparación no encontrada');

    if (existing._count.products > 0) {
      throw new ConflictException(
        `No se puede eliminar: hay ${existing._count.products} producto(s) que usan esta área. ` +
          'Reasigná los productos primero.',
      );
    }

    await this.prisma.preparationArea.delete({ where: { id } });
  }

  private toDto(p: PreparationArea): PreparationAreaDTO {
    return {
      id: p.id,
      businessId: p.businessId,
      branchId: p.branchId,
      name: p.name,
      code: p.code,
      description: p.description,
      isActive: p.isActive,
      displayOrder: p.displayOrder,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
