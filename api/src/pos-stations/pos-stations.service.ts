import { Injectable, NotFoundException, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { randomBytes } from 'node:crypto';

/**
 * Payload del JWT que identifica una sesión de estación POS.
 */
export interface StationJwtPayload {
  /** ID del negocio (businessId) */
  businessId: string;
  /** ID de la sucursal */
  branchId: string;
  /** ID de la estación POS */
  stationId: string;
  /** Propósito fijo para evitar reuso del token en otros contextos */
  purpose: 'pos_station';
}

@Injectable()
export class PosStationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
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
   * y retorna un JWT firmado (businessSig) para la estación POS.
   *
   * El JWT tiene expiración de 24h e incluye businessId, branchId y stationId.
   * A diferencia de la versión anterior (base64), este token es firmado con
   * JWT_SECRET y no puede ser manipulado por el cliente.
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

    // ── JWT firmado (reemplaza el anterior base64) ─────────────────
    // Incluimos un campo `purpose` para que este JWT solo sea válido
    // en contexto de estación POS (no puede reusarse como token de auth).
    const payload: StationJwtPayload = {
      businessId: business.id,
      branchId: station.branchId,
      stationId: station.id,
      purpose: 'pos_station',
    };

    const businessSig = await this.jwt.signAsync(payload, {
      expiresIn: '24h',
      secret: process.env.JWT_SECRET,
    });

    return {
      stationId: station.id,
      branchId: station.branchId,
      branchName: station.branch.name,
      businessSig,
    };
  }

  /**
   * Verifica un JWT de estación POS y devuelve el payload si es válido.
   * Útil para que el web app (admin) autentique requests provenientes
   * de una estación POS.
   */
  async verifyStationToken(token: string): Promise<StationJwtPayload> {
    let payload: StationJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<StationJwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Token de estación inválido o expirado');
    }

    if (payload.purpose !== 'pos_station') {
      throw new ForbiddenException('Token inválido para estación POS');
    }

    return payload;
  }

  /**
   * Intercambia un JWT de estación POS por una sesión de usuario completa.
   * Busca un usuario activo con rol CAJERO o MESERO en el negocio y
   * genera un JWT de acceso con su identidad, pero con `defaultBranchId`
   * forzado a la sucursal de la estación.
   *
   * Esto permite que una estación POS acceda al sistema sin login manual,
   * usando únicamente el código de activación de la estación.
   */
  async stationLogin(stationToken: string) {
    // 1. Verificar el JWT de estación
    const stationPayload = await this.verifyStationToken(stationToken);

    // 2. Buscar un usuario activo del negocio con rol POS-compatible
    const user = await this.prisma.user.findFirst({
      where: {
        businessId: stationPayload.businessId,
        status: 'ACTIVE',
        role: { in: ['CAJERO', 'MESERO', 'ADMIN', 'OWNER'] },
      },
      orderBy: { lastLoginAt: 'desc' },
      include: {
        business: true,
        defaultBranch: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'No hay un usuario activo disponible para esta estación. ' +
        'Un administrador debe crear un usuario con rol Cajero o Mesero primero.',
      );
    }

    // 3. Generar access + refresh tokens para este usuario
    const branches = await this.prisma.branch.findMany({
      where: { businessId: user.businessId, status: 'ACTIVE' },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });

    const branchIds = branches.map((b) => b.id);
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      sub: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
      branchIds,
      typ: 'access' as const,
      iat: now,
      exp: now + 900, // 15 min
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m' as never,
    });

    const refreshPayload = { ...payload, typ: 'refresh' as const, exp: now + 604800 }; // 7d
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: '7d' as never,
    });

    // 4. Construir el user DTO (similar a AuthService.buildAuthenticatedUserDto)
    const userDto = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      businessId: user.businessId,
      // Forzar branchId a la sucursal de la estación
      defaultBranchId: stationPayload.branchId,
      business: {
        id: user.business.id,
        name: user.business.name,
        slug: user.business.slug,
        legalName: user.business.legalName,
        taxId: user.business.taxId,
        email: user.business.email,
        phone: user.business.phone,
        logoUrl: user.business.logoUrl,
        currency: user.business.currency,
        timezone: user.business.timezone,
        status: user.business.status,
        plan: user.business.plan,
        trialEndsAt: user.business.trialEndsAt?.toISOString() ?? null,
        planId: user.business.planId,
        subscription: null,
        moduleReports: user.business.moduleReports,
        moduleInventory: user.business.moduleInventory,
        modulePosStations: user.business.modulePosStations,
        moduleDeliveryApp: user.business.moduleDeliveryApp,
        createdAt: user.business.createdAt.toISOString(),
        updatedAt: user.business.updatedAt.toISOString(),
      },
      branches: branches.map((b) => ({
        id: b.id,
        businessId: b.businessId,
        name: b.name,
        code: b.code,
        address: b.address,
        phone: b.phone,
        isMain: b.isMain,
        status: b.status,
        categoriesCount: 0,
        productsCount: 0,
        tablesCount: 0,
        activeOrdersCount: 0,
        openCashRegistersCount: 0,
        openShiftsCount: 0,
        activePosStationsCount: 0,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    };

    return {
      accessToken,
      refreshToken,
      user: userDto,
    };
  }

  /**
   * Genera un nuevo código de estación POS.
   * OWNER/ADMIN crea un código para activar la estación POS.
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
