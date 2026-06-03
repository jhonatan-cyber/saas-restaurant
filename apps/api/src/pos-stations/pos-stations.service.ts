import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { randomBytes } from 'node:crypto';

@Injectable()
export class PosStationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Genera un código de estación de 6 caracteres alfanuméricos (mayúsculas).
   */
  private generateCode(): string {
    return randomBytes(4)
      .toString('base64')
      .replace(/[+/=]/g, '')
      .slice(0, 6)
      .toUpperCase();
  }

  /**
   * Activa una estación POS.
   * Busca el PosStation por business slug + stationCode, la activa, audita,
   * y retorna businessSig para que el desktop se autentique en la web app.
   */
  async activate(dto: {
    businessSlug: string;
    stationCode: string;
    deviceName?: string;
  }) {
    const business = await this.prisma.business.findUnique({
      where: { slug: dto.businessSlug },
      select: { id: true, name: true },
    });
    if (!business) {
      throw new NotFoundException('Business no encontrado');
    }

    const station = await this.prisma.posStation.findUnique({
      where: {
        businessId_stationCode: {
          businessId: business.id,
          stationCode: dto.stationCode.toUpperCase(),
        },
      },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!station) {
      throw new NotFoundException('Código de estación inválido');
    }

    // Activar / reactivar
    await this.prisma.posStation.update({
      where: { id: station.id },
      data: {
        isActive: true,
        activatedAt: station.activatedAt ?? new Date(),
        lastSeenAt: new Date(),
        deviceName: dto.deviceName ?? station.deviceName,
      },
    });

    // Auditoría
    await this.audit.log({
      businessId: business.id,
      userId: station.activatedBy ?? 'system',
      action: AuditAction.STATION_ACTIVATE,
      entity: 'PosStation',
      entityId: station.id,
      after: { stationCode: dto.stationCode, deviceName: dto.deviceName },
    });

    // Firma simple — base64 de datos mínimos
    const sessionPayload = `${business.id}:${station.branchId}:${station.id}:${Date.now()}`;
    const businessSig = Buffer.from(sessionPayload).toString('base64');

    return {
      stationId: station.id,
      branchId: station.branchId,
      branchName: station.branch.name,
      businessSig,
    };
  }

  /**
   * Genera un nuevo código de estación POS.
   * OWNER/ADMIN crea un código para que el desktop lo use al activar.
   */
  async generate(dto: {
    businessId: string;
    branchId: string;
    name: string | null;
  }) {
    // Verificar que la sucursal pertenece al business
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, businessId: dto.businessId },
    });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada en este negocio');
    }

    // Generar código único (reintentar si hay colisión)
    let stationCode: string;
    let attempts = 0;
    do {
      stationCode = this.generateCode();
      const existing = await this.prisma.posStation.findUnique({
        where: {
          businessId_stationCode: {
            businessId: dto.businessId,
            stationCode,
          },
        },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const station = await this.prisma.posStation.create({
      data: {
        businessId: dto.businessId,
        branchId: dto.branchId,
        stationCode,
        name: dto.name,
      },
    });

    return station;
  }

  /**
   * Lista estaciones POS filtradas por sucursal y/o estado.
   */
  async list(dto: {
    businessId: string;
    branchId?: string;
    isActive?: boolean;
  }) {
    const where: Record<string, unknown> = { businessId: dto.businessId };
    if (dto.branchId) where.branchId = dto.branchId;
    if (dto.isActive !== undefined) where.isActive = dto.isActive;

    return this.prisma.posStation.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }
}
