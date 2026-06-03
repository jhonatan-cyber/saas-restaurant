import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AuditAction, type RestaurantTable } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { TableDTO, TableStatus } from '@saas/shared';
import {
  CreateTableDto,
  UpdateTableDto,
  ChangeTableStatusDto,
  type TableFiltersDto,
} from './dto/table.dto';

/**
 * Mesas del salón.
 *  - Multi-tenant: filtra por businessId.
 *  - Branch-scoped: las mesas SIEMPRE pertenecen a una branch (no son globales).
 *  - Soft delete vía `deletedAt`.
 *  - Cambios de estado se persisten en `TableStateLog` para auditoría.
 */
@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Resuelve la branch que usaremos si el caller no pasó un filtro explícito.
   * Prioridad:
   *  1. `branchId` en el filtro (lo que pidió el caller).
   *  2. `branchId` del BusinessContext (resuelto por ScopeGuard vía header).
   *  3. Sucursal principal del business (isMain=true).
   */
  private async resolveBranchId(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    branchId?: string,
  ): Promise<string> {
    if (branchId) return branchId;
    if (context?.branchId) return context.branchId;

    const main = await this.prisma.branch.findFirst({
      where: { businessId: user.businessId, isMain: true },
      select: { id: true },
    });
    if (!main) {
      throw new NotFoundException('No hay una sucursal principal configurada para el negocio');
    }
    return main.id;
  }

  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: TableFiltersDto,
  ): Promise<PaginatedResult<TableDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const resolvedBranchId = await this.resolveBranchId(user, context, filters.branchId);

    const where: Prisma.RestaurantTableWhereInput = {
      ...tenant,
      deletedAt: null,
      branchId: resolvedBranchId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.location ? { location: filters.location } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.restaurantTable.count({ where }),
      this.prisma.restaurantTable.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { number: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((t) => this.toDto(t)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * Listado plano (para floor plan). Incluye posX/posY.
   */
  async listAll(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { branchId?: string },
  ): Promise<TableDTO[]> {
    const tenant = this.prisma.tenantFilter(user, context);
    const resolvedBranchId = await this.resolveBranchId(user, context, filters?.branchId);

    const rows = await this.prisma.restaurantTable.findMany({
      where: {
        ...tenant,
        deletedAt: null,
        branchId: resolvedBranchId,
      },
      orderBy: [{ displayOrder: 'asc' }, { number: 'asc' }],
    });
    return rows.map((t) => this.toDto(t));
  }

  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<TableDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const table = await this.prisma.restaurantTable.findFirst({
      where: { ...tenant, id, deletedAt: null },
    });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return this.toDto(table);
  }

  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreateTableDto,
  ): Promise<TableDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    // Verificar que la branch pertenece al business
    const branch = await this.prisma.branch.findFirst({
      where: { businessId: user.businessId, id: dto.branchId },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('La sucursal indicada no existe');

    // Validar número único por branch
    const dup = await this.prisma.restaurantTable.findFirst({
      where: { ...tenant, branchId: dto.branchId, number: dto.number, deletedAt: null },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Ya existe una mesa con ese número en esa sucursal');

    const created = await this.prisma.restaurantTable.create({
      data: {
        ...tenant,
        branchId: dto.branchId,
        number: dto.number,
        capacity: dto.capacity ?? 4,
        location: dto.location ?? 'INDOOR',
        displayOrder: dto.displayOrder ?? 0,
        notes: dto.notes,
        posX: dto.posX,
        posY: dto.posY,
        status: 'FREE',
      },
    });
    return this.toDto(created);
  }

  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdateTableDto,
  ): Promise<TableDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    const existing = await this.prisma.restaurantTable.findFirst({
      where: { ...tenant, id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Mesa no encontrada');

    if (dto.number && dto.number !== existing.number) {
      const dup = await this.prisma.restaurantTable.findFirst({
        where: { ...tenant, branchId: existing.branchId, number: dto.number, deletedAt: null, NOT: { id } },
        select: { id: true },
      });
      if (dup) throw new ConflictException('Ya existe una mesa con ese número en esa sucursal');
    }

    const updated = await this.prisma.restaurantTable.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.posX !== undefined ? { posX: dto.posX } : {}),
        ...(dto.posY !== undefined ? { posY: dto.posY } : {}),
      },
    });
    return this.toDto(updated);
  }

  /**
   * Cambia el estado de la mesa y registra el cambio en TableStateLog.
   * Si el estado no cambia, es un no-op (no se crea log).
   */
  async changeStatus(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: ChangeTableStatusDto,
  ): Promise<TableDTO> {
    const tenant = this.prisma.tenantFilter(user, context);

    const existing = await this.prisma.restaurantTable.findFirst({
      where: { ...tenant, id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Mesa no encontrada');

    if (existing.status === dto.status) {
      return this.toDto(existing);
    }

    const previous = existing.status as TableStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.restaurantTable.update({
        where: { id },
        data: { status: dto.status },
      });
      await tx.tableStateLog.create({
        data: {
          businessId: user.businessId,
          tableId: id,
          previousStatus: previous,
          newStatus: dto.status,
          changedByUserId: user.id,
          reason: dto.reason ?? null,
        },
      });
      return t;
    });

    await this.audit.log({
      businessId: user.businessId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: 'RestaurantTable',
      entityId: id,
      before: { status: previous },
      after: { status: dto.status, reason: dto.reason ?? null },
    });

    return this.toDto(updated);
  }

  async softDelete(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<void> {
    const tenant = this.prisma.tenantFilter(user, context);
    const existing = await this.prisma.restaurantTable.findFirst({
      where: { ...tenant, id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Mesa no encontrada');

    await this.prisma.restaurantTable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      businessId: user.businessId,
      userId: user.id,
      action: AuditAction.SOFT_DELETE,
      entity: 'RestaurantTable',
      entityId: id,
    });
  }

  private toDto(t: RestaurantTable): TableDTO {
    return {
      id: t.id,
      businessId: t.businessId,
      branchId: t.branchId,
      number: t.number,
      capacity: t.capacity,
      location: t.location,
      status: t.status,
      displayOrder: t.displayOrder,
      notes: t.notes,
      posX: t.posX,
      posY: t.posY,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
