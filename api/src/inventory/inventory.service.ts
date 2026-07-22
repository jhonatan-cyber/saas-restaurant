import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { InventoryMovementDTO, InventoryKardexDTO, LowStockProductDTO } from '@saas/shared';
import type { InventoryFiltersDto, AdjustInventoryDto } from './dto/inventory.dto';

/**
 * InventoryService: consultas de inventario (kardex, stock actual, bajo stock).
 *
 * Los movimientos de inventario se CREAN automáticamente al completar una
 * compra (PurchasesService.complete). Este módulo es principalmente de LECTURA.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kardex de un producto específico en una branch.
   */
  async getKardex(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    productId: string,
    branchId?: string,
  ): Promise<InventoryKardexDTO> {
    const businessId = context?.businessId ?? user.businessId;
    const resolvedBranchId = branchId ?? context?.branchId;
    if (!resolvedBranchId) {
      throw new NotFoundException('Se requiere branchId para ver el kardex');
    }

    const product = await this.prisma.product.findFirst({
      where: { businessId, id: productId, deletedAt: null },
      select: { id: true, name: true, sku: true, currentStock: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { businessId, branchId: resolvedBranchId, productId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      currentStock: product.currentStock.toString(),
      movements: movements.map((m) => ({
        id: m.id,
        businessId: m.businessId,
        branchId: m.branchId,
        productId: m.productId,
        type: m.type as InventoryMovementDTO['type'],
        referenceType: m.referenceType as InventoryMovementDTO['referenceType'],
        referenceId: m.referenceId,
        quantity: m.quantity.toString(),
        unitCost: m.unitCost?.toString() ?? null,
        totalCost: m.totalCost?.toString() ?? null,
        runningBalance: m.runningBalance.toString(),
        notes: m.notes,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Lista de productos con stock bajo (currentStock <= minStock).
   */
  async getLowStock(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters?: { branchId?: string },
  ): Promise<LowStockProductDTO[]> {
    const businessId = context?.businessId ?? user.businessId;

    const where: Prisma.ProductWhereInput = {
      businessId,
      deletedAt: null,
      trackStock: true,
      minStock: { not: null },
      ...(filters?.branchId ? { branchId: filters.branchId } : {}),
    };

    // Prisma no permite comparar columnas en where, así que cargamos y filtramos
    const allTracked = await this.prisma.product.findMany({
      where,
      orderBy: [{ currentStock: 'asc' }],
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minStock: true,
      },
    });

    const rows = allTracked.filter(
      (p) => p.minStock !== null && p.currentStock.lte(p.minStock),
    );

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: p.currentStock.toString(),
      minStock: p.minStock,
    }));
  }

  /**
   * Ajuste manual de inventario (F4-03).
   * Crea un InventoryMovement y actualiza currentStock del producto.
   */
  async adjustStock(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: AdjustInventoryDto,
  ): Promise<{ id: string; productId: string; quantity: string; runningBalance: string; type: string }> {
    const businessId = context?.businessId ?? user.businessId;
    const resolvedBranchId = dto.branchId ?? context?.branchId;

    // Verificar que el producto existe y es trackeable
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, businessId, deletedAt: null },
      select: { id: true, trackStock: true, currentStock: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    // Cantidad negativa para OUT, positiva para IN
    const qty = dto.type === 'OUT'
      ? new Prisma.Decimal(-dto.quantity)
      : new Prisma.Decimal(dto.quantity);

    const beforeStock = product.currentStock;
    const newBalance = Prisma.Decimal.max(beforeStock.plus(qty), new Prisma.Decimal(0));

    const result = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          businessId,
          branchId: resolvedBranchId,
          productId: dto.productId,
          type: dto.type,
          referenceType: 'ADJUSTMENT',
          quantity: qty,
          runningBalance: newBalance,
          notes: `Ajuste manual: ${dto.reason}`,
        },
      });

      await tx.product.update({
        where: { id: dto.productId },
        data: { currentStock: newBalance },
      });

      return movement;
    });

    return {
      id: result.id,
      productId: result.productId,
      quantity: result.quantity.toString(),
      runningBalance: result.runningBalance.toString(),
      type: result.type,
    };
  }

  /**
   * Lista paginada de movimientos de inventario (kardex global).
   */
  async listMovements(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: InventoryFiltersDto,
  ): Promise<{ data: InventoryMovementDTO[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const businessId = context?.businessId ?? user.businessId;

    const where: Prisma.InventoryMovementWhereInput = {
      businessId,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.count({ where }),
      this.prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          product: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: rows.map((m) => ({
        id: m.id,
        businessId: m.businessId,
        branchId: m.branchId,
        productId: m.productId,
        productName: m.product.name,
        type: m.type as InventoryMovementDTO['type'],
        referenceType: m.referenceType as InventoryMovementDTO['referenceType'],
        referenceId: m.referenceId,
        quantity: m.quantity.toString(),
        unitCost: m.unitCost?.toString() ?? null,
        totalCost: m.totalCost?.toString() ?? null,
        runningBalance: m.runningBalance.toString(),
        notes: m.notes,
        createdAt: m.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}
