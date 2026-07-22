import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Purchase, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { PurchaseDTO, PurchaseListItemDTO } from '@saas/shared';
import {
  CreatePurchaseDto,
  UpdatePurchaseDto,
  type PurchaseFiltersDto,
} from './dto/purchase.dto';
import { toPurchaseDto, toPurchaseListItemDto, type PurchaseWithRelations } from './mappers';

/**
 * PurchasesService: CRUD de compras + finalización.
 *
 * - Create: crea Purchase + PurchaseItems, calcula subtotal y total.
 * - Complete: marca COMPLETED, genera InventoryMovement por item,
 *   actualiza currentStock del producto, asigna receivedAt/receivedBy.
 * - Cancel: solo si PENDING.
 */
@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: PurchaseFiltersDto,
  ): Promise<PaginatedResult<PurchaseListItemDTO>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const tenant = this.prisma.tenantFilter(user, context);

    const where: Prisma.PurchaseWhereInput = {
      businessId: tenant.businessId,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            },
          }
        : {}),
      ...(filters.search ? { purchaseNumber: { contains: filters.search } } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          supplier: { select: { id: true, name: true } },
          items: { select: { id: true, productName: true, quantity: true, lineTotal: true } },
        },
      }),
    ]);

    return {
      data: rows.map((p) => toPurchaseListItemDto(p)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<PurchaseDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const purchase = await this.prisma.purchase.findFirst({
      where: { businessId: tenant.businessId, id },
      include: {
        supplier: true,
        items: true,
      },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    return toPurchaseDto(purchase);
  }

  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreatePurchaseDto,
  ): Promise<PurchaseDTO> {
    const businessId = context?.businessId ?? user.businessId;

    // Validar unicidad de purchaseNumber
    const existing = await this.prisma.purchase.findFirst({
      where: { businessId, purchaseNumber: dto.purchaseNumber },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una compra con ese número');
    }

    // Cargar precios de productos para snapshot + calcular totales
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { businessId, id: { in: productIds }, deletedAt: null },
      select: { id: true, name: true, cost: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validar que todos los productos existen
    for (const item of dto.items) {
      if (!productMap.has(item.productId)) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }
    }

    // Prisma.Decimal for currency: native JS number math loses precision
    // (0.1 + 0.2 === 0.30000000000000004 in IEEE-754). DTO fields arrive as
    // `number` because the HTTP boundary already coerces primitives; we wrap
    // at the edge and keep all arithmetic in Decimal land until the DTO output.
    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      // DTO inputs are `number`; wrap into Decimal at the boundary.
      const quantity = new Prisma.Decimal(item.quantity);
      const unitCost = new Prisma.Decimal(item.unitCost);
      // lineTotal = quantity * unitCost in Decimal math, not float.
      const lineTotal = quantity.times(unitCost);

      return {
        productId: item.productId,
        productName: product.name,
        unitCost,
        quantity,
        lineTotal,
      };
    });

    // Sum lineTotals in Decimal to preserve precision across N items.
    const subtotal = itemsData.reduce(
      (sum, i) => sum.plus(i.lineTotal),
      new Prisma.Decimal(0),
    );
    // DTO taxTotal is optional `number`; wrap at the boundary.
    const taxTotal = new Prisma.Decimal(dto.taxTotal ?? 0);
    // total = subtotal + taxTotal in Decimal math.
    const total = subtotal.plus(taxTotal);

    const created = await this.prisma.purchase.create({
      data: {
        businessId,
        branchId: dto.branchId,
        supplierId: dto.supplierId ?? null,
        purchaseNumber: dto.purchaseNumber,
        status: PurchaseStatus.PENDING,
        // subtotal/taxTotal/total are already Prisma.Decimal from the math
        // above; pass them straight through (no re-wrapping required).
        subtotal,
        taxTotal,
        total,
        notes: dto.notes ?? null,
        createdById: user.id,
        items: {
          // Each `i` already has Decimal unitCost/quantity/lineTotal; spread
          // those fields as-is and only re-pick the scalar ones.
          create: itemsData.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unitCost: i.unitCost,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    return toPurchaseDto(created);
  }

  async update(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    dto: UpdatePurchaseDto,
  ): Promise<PurchaseDTO> {
    const businessId = context?.businessId ?? user.businessId;

    const existing = await this.prisma.purchase.findFirst({
      where: { businessId, id },
      include: { supplier: true, items: true },
    });
    if (!existing) throw new NotFoundException('Compra no encontrada');

    if (existing.status !== PurchaseStatus.PENDING) {
      throw new ConflictException('Solo se puede editar compras pendientes');
    }

    // Validar purchaseNumber único si cambia
    if (dto.purchaseNumber && dto.purchaseNumber !== existing.purchaseNumber) {
      const dup = await this.prisma.purchase.findFirst({
        where: { businessId, purchaseNumber: dto.purchaseNumber, NOT: { id } },
        select: { id: true },
      });
      if (dup) throw new ConflictException('Ya existe una compra con ese número');
    }

    const updated = await this.prisma.purchase.update({
      where: { id },
      data: {
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.purchaseNumber !== undefined ? { purchaseNumber: dto.purchaseNumber } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { supplier: true, items: true },
    });

    return toPurchaseDto(updated);
  }

  /**
   * Completa la compra: marca COMPLETED + receivedAt, y genera InventoryMovement.
   */
  async complete(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
    receivedAt?: string,
  ): Promise<PurchaseDTO> {
    const businessId = context?.businessId ?? user.businessId;

    const purchase = await this.prisma.purchase.findFirst({
      where: { businessId, id },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new ConflictException('Solo se puede completar compras pendientes');
    }

    // Usar transacción para asegurar consistencia
    const [updated] = await this.prisma.$transaction(async (tx) => {
      // 1. Marcar como completada
      const now = receivedAt ? new Date(receivedAt) : new Date();
      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          status: PurchaseStatus.COMPLETED,
          receivedAt: now,
          receivedBy: user.id,
        },
      });

      // 2. Generar InventoryMovement por cada item + actualizar stock
      for (const item of purchase.items) {
        // Buscar el último running balance para este producto en esta branch
        const lastMovement = await tx.inventoryMovement.findFirst({
          where: { businessId, branchId: purchase.branchId, productId: item.productId! },
          orderBy: { createdAt: 'desc' },
          select: { runningBalance: true },
        });

        // Prisma returns Decimal | null. Round-trip through .toString() to
        // build a fresh Decimal with full precision (Number() would lose
        // trailing decimals like 0.30000000000000004).
        const previousBalance = lastMovement?.runningBalance
          ? new Prisma.Decimal(lastMovement.runningBalance.toString())
          : new Prisma.Decimal(0);
        // item.quantity is already a Prisma.Decimal; re-wrap via .toString()
        // for the same precision-preserving reason before any arithmetic.
        const itemQuantity = new Prisma.Decimal(item.quantity.toString());
        const itemUnitCost = new Prisma.Decimal(item.unitCost.toString());
        // previousBalance + item.quantity in Decimal land (NOT native +).
        const newBalance = previousBalance.plus(itemQuantity);
        // quantity * unitCost in Decimal land (NOT native *).
        const totalCost = itemQuantity.times(itemUnitCost);

        // Crear movement
        await tx.inventoryMovement.create({
          data: {
            businessId,
            branchId: purchase.branchId,
            productId: item.productId!,
            type: 'IN' as const,
            referenceType: 'PURCHASE' as const,
            referenceId: id,
            quantity: itemQuantity,
            unitCost: itemUnitCost,
            totalCost,
            runningBalance: newBalance,
          },
        });

        // Actualizar currentStock del producto. Pass the Decimal to the atomic
        // `increment` so the server-side add keeps full precision.
        await tx.product.update({
          where: { id: item.productId! },
          data: {
            currentStock: { increment: itemQuantity },
          },
        });
      }

      return [updatedPurchase];
    });

    const full = await this.prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true, items: true },
    });
    return toPurchaseDto(full!);
  }

  /**
   * Cancela una compra PENDING.
   */
  async cancel(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    id: string,
  ): Promise<PurchaseDTO> {
    const businessId = context?.businessId ?? user.businessId;

    const existing = await this.prisma.purchase.findFirst({
      where: { businessId, id },
      include: { supplier: true, items: true },
    });
    if (!existing) throw new NotFoundException('Compra no encontrada');
    if (existing.status !== PurchaseStatus.PENDING) {
      throw new ConflictException('Solo se puede cancelar compras pendientes');
    }

    const updated = await this.prisma.purchase.update({
      where: { id },
      data: { status: PurchaseStatus.CANCELLED },
      include: { supplier: true, items: true },
    });

    return toPurchaseDto(updated);
  }

  // ==================== HELPERS ====================

  // toListItem and toDto moved to ./mappers.ts — imported as toPurchaseListItemDto and toPurchaseDto

}
