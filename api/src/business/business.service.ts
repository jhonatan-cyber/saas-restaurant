import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateBusinessSettingsDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener datos del negocio + plan activo.
   */
  async getSettings(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        planRef: true,
        subscription: true,
      },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    return business;
  }

  /**
   * Actualizar configuración del negocio.
   */
  async updateSettings(businessId: string, dto: UpdateBusinessSettingsDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');

    const data = {} as Prisma.BusinessUpdateInput;
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.legalName !== undefined) data.legalName = dto.legalName?.trim() ?? null;
    if (dto.taxId !== undefined) data.taxId = dto.taxId?.trim() ?? null;
    if (dto.email !== undefined) data.email = dto.email.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() ?? null;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.moduleReports !== undefined) data.moduleReports = dto.moduleReports;
    if (dto.moduleInventory !== undefined) data.moduleInventory = dto.moduleInventory;
    if (dto.modulePosStations !== undefined) data.modulePosStations = dto.modulePosStations;
    if (dto.moduleDeliveryApp !== undefined) data.moduleDeliveryApp = dto.moduleDeliveryApp;

    return this.prisma.business.update({
      where: { id: businessId },
      data,
      include: {
        planRef: true,
        subscription: true,
      },
    });
  }
}
