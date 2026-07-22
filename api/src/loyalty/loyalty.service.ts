import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { LoyaltyProgramDTO, CustomerLoyaltyDTO, LoyaltyRedemptionDTO } from '@saas/shared';

/**
 * LoyaltyService: Programa de fidelización basado en puntos.
 *
 * - Cada negocio configura sus propias reglas (LoyaltyProgram).
 * - Los clientes ganan puntos cuando sus órdenes son pagadas.
 * - Los puntos se canjean por descuentos en nuevas órdenes.
 */
@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene o crea la configuración del programa de fidelización para un negocio.
   * Si no existe, crea una por defecto.
   */
  async getOrCreateProgram(businessId: string): Promise<{
    id: string;
    businessId: string;
    enabled: boolean;
    pointsPerCurrency: Prisma.Decimal;
    pointValue: Prisma.Decimal;
    minRedeemPoints: number;
    maxRedeemPerOrder: number | null;
    autoAward: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    let program = await this.prisma.loyaltyProgram.findUnique({
      where: { businessId },
    });
    if (!program) {
      program = await this.prisma.loyaltyProgram.create({
        data: { businessId },
      });
    }
    return program;
  }

  /**
   * Actualiza la configuración del programa de fidelización.
   */
  async updateProgram(
    businessId: string,
    dto: Partial<{
      enabled: boolean;
      pointsPerCurrency: number;
      pointValue: number;
      minRedeemPoints: number;
      maxRedeemPerOrder: number | null;
      autoAward: boolean;
    }>,
  ): Promise<{
    id: string;
    businessId: string;
    enabled: boolean;
    pointsPerCurrency: Prisma.Decimal;
    pointValue: Prisma.Decimal;
    minRedeemPoints: number;
    maxRedeemPerOrder: number | null;
    autoAward: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const program = await this.prisma.loyaltyProgram.upsert({
      where: { businessId },
      create: { businessId, ...dto as any },
      update: dto as any,
    });
    return program;
  }

  /**
   * Obtiene la información de fidelización de un cliente.
   * Incluye puntos disponibles, programa activo, y cuántos puntos puede canjear.
   */
  async getCustomerLoyalty(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    customerId: string,
  ): Promise<CustomerLoyaltyDTO> {
    const tenant = this.prisma.tenantFilter(user, context);
    const customer = await this.prisma.customer.findFirst({
      where: { ...tenant, id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const program = await this.getOrCreateProgram(user.businessId);
    const pointsPerCurrency = Number(program.pointsPerCurrency);

    return {
      customer: {
        id: customer.id,
        businessId: customer.businessId,
        name: customer.name,
        taxId: customer.taxId,
        taxIdType: customer.taxIdType,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        addressReference: customer.addressReference,
        latitude: customer.latitude?.toString() ?? null,
        longitude: customer.longitude?.toString() ?? null,
        notes: customer.notes,
        isActive: customer.isActive,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent.toString(),
        lastOrderAt: customer.lastOrderAt?.toISOString() ?? null,
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyPointsEarned: customer.loyaltyPointsEarned,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      },
      program: {
        id: program.id,
        businessId: program.businessId,
        enabled: program.enabled,
        pointsPerCurrency: Number(program.pointsPerCurrency),
        pointValue: Number(program.pointValue),
        minRedeemPoints: program.minRedeemPoints,
        maxRedeemPerOrder: program.maxRedeemPerOrder,
        autoAward: program.autoAward,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
      },
      availablePoints: customer.loyaltyPoints,
      pointsEarned: customer.loyaltyPointsEarned,
      maxRedeemable: program.maxRedeemPerOrder
        ? Math.min(customer.loyaltyPoints, program.maxRedeemPerOrder)
        : customer.loyaltyPoints,
      pointsToNextAward: pointsPerCurrency,
    };
  }

  /**
   * Calcula el descuento por canjear puntos.
   * No persiste nada - solo calcula para mostrar en frontend.
   */
  async previewRedemption(
    user: AuthenticatedUser,
    customerId: string,
    points: number,
  ): Promise<{ points: number; discount: number; valid: boolean; reason?: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: { businessId: user.businessId, id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const program = await this.getOrCreateProgram(user.businessId);
    if (!program.enabled) {
      return { points, discount: 0, valid: false, reason: 'Programa de puntos desactivado' };
    }
    if (points < program.minRedeemPoints) {
      return { points, discount: 0, valid: false, reason: `Mínimo ${program.minRedeemPoints} puntos para canjear` };
    }
    if (points > customer.loyaltyPoints) {
      return { points, discount: 0, valid: false, reason: `Solo tenés ${customer.loyaltyPoints} puntos disponibles` };
    }
    if (program.maxRedeemPerOrder && points > program.maxRedeemPerOrder) {
      return { points, discount: 0, valid: false, reason: `Máximo ${program.maxRedeemPerOrder} puntos por orden` };
    }

    const discount = Number(program.pointValue) * points;
    return { points, discount, valid: true };
  }

  /**
   * Canjea puntos y crea un registro de redención.
   * Llamado internamente por OrdersService al crear una orden con descuento.
   */
  async redeemPoints(
    tx: Prisma.TransactionClient,
    params: {
      businessId: string;
      customerId: string;
      orderId: string;
      points: number;
      discountAmount: number;
    },
  ): Promise<void> {
    const program = await tx.loyaltyProgram.findUnique({
      where: { businessId: params.businessId },
    });
    if (!program || !program.enabled) {
      throw new BadRequestException('Programa de puntos no activo');
    }
    if (params.points < program.minRedeemPoints) {
      throw new BadRequestException(`Mínimo ${program.minRedeemPoints} puntos para canjear`);
    }

    const customer = await tx.customer.findUnique({
      where: { id: params.customerId },
      select: { loyaltyPoints: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (customer.loyaltyPoints < params.points) {
      throw new BadRequestException(
        `Puntos insuficientes. Disponibles: ${customer.loyaltyPoints}, solicitados: ${params.points}`,
      );
    }

    // Deduct points and create redemption record
    await tx.customer.update({
      where: { id: params.customerId },
      data: { loyaltyPoints: { decrement: params.points } },
    });

    await tx.loyaltyRedemption.create({
      data: {
        businessId: params.businessId,
        customerId: params.customerId,
        orderId: params.orderId,
        pointsUsed: params.points,
        discountAmount: new Prisma.Decimal(params.discountAmount),
        notes: `Canje de ${params.points} puntos por Bs ${params.discountAmount.toFixed(2)} de descuento`,
      },
    });
  }

  /**
   * Otorga puntos a un cliente después de pagar una orden.
   * Llamado internamente por PaymentsService.
   */
  async awardPoints(
    tx: Prisma.TransactionClient,
    params: {
      businessId: string;
      customerId: string;
      totalPaid: number;
    },
  ): Promise<number> {
    const program = await tx.loyaltyProgram.findUnique({
      where: { businessId: params.businessId },
    });
    if (!program || !program.enabled || !program.autoAward) return 0;

    const pointsPerCurrency = Number(program.pointsPerCurrency);
    const pointsEarned = Math.floor(params.totalPaid / pointsPerCurrency);
    if (pointsEarned <= 0) return 0;

    await tx.customer.update({
      where: { id: params.customerId },
      data: {
        loyaltyPoints: { increment: pointsEarned },
        loyaltyPointsEarned: { increment: pointsEarned },
      },
    });

    return pointsEarned;
  }

  /**
   * Historial de canjes de un cliente.
   */
  async getRedemptionHistory(
    user: AuthenticatedUser,
    customerId: string,
  ): Promise<LoyaltyRedemptionDTO[]> {
    const redemptions = await this.prisma.loyaltyRedemption.findMany({
      where: { businessId: user.businessId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return redemptions.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      orderId: r.orderId,
      pointsUsed: r.pointsUsed,
      discountAmount: r.discountAmount.toString(),
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
