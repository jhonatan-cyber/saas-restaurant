import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import type { BillingPeriod, Role, SaaSRole, SubscriptionStatus, LoginInput } from '@saas/shared';
import type { LoginResponseDTO, JwtPayload, AuthenticatedUserDTO } from '@saas/shared';

/**
 * AuthService: lógica de autenticación multi-tenant.
 *
 *  - `validateUser` resuelve el tenant vía businessSlug y luego busca al
 *    usuario por [businessId, email]. La contraseña se compara con bcrypt.
 *  - `login` emite access + refresh tokens y carga el contexto del usuario.
 *  - `refresh` valida el refresh token y emite un nuevo access token.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Login unificado.
   * - Si `businessSlug` está presente → login contra User (restaurant).
   * - Si no → login contra SaaSUser (admin plataforma).
   */
  async login(input: LoginInput): Promise<LoginResponseDTO | { accessToken: string; refreshToken: string; user: { id: string; email: string; role: SaaSRole } }> {
    if (input.businessSlug) {
      return this.businessLogin(input as Required<LoginInput>);
    }
    return this.saasLogin(input);
  }

  private async businessLogin(input: Required<LoginInput>): Promise<LoginResponseDTO> {
    const user = await this.validateUser(input.businessSlug, input.email, input.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const branchIds = await this.resolveUserBranchIds(user.businessId, user.id);

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
      branchIds,
      userType: 'business',
      typ: 'access',
    };

    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken({ ...payload, typ: 'refresh' });

    await this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch((err: unknown) => {
        this.logger.warn(`No se pudo actualizar lastLoginAt: ${String(err)}`);
      });

    const userDto = await this.buildAuthenticatedUserDto(user.id);

    return { accessToken, refreshToken, user: userDto };
  }

  private async saasLogin(input: LoginInput): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: SaaSRole } }> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const saasUser = await this.prisma.saaSUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!saasUser) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (saasUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('Cuenta desactivada. Contacte al administrador.');
    }

    const passwordOk = await bcrypt.compare(input.password, saasUser.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.saaSUser.update({
      where: { id: saasUser.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: saasUser.id,
      email: saasUser.email,
      saasRole: saasUser.role,
      userType: 'saas',
      typ: 'access',
    };

    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      ...payload,
      typ: 'refresh',
    };

    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(refreshPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: saasUser.id,
        email: saasUser.email,
        role: saasUser.role,
      },
    };
  }

  /**
   * Refresh: recibe el refresh token (validado por JwtRefreshStrategy),
   * emite un nuevo access token con el mismo payload.
   */
  async refresh(user: { sub: string; email: string; businessId?: string; role?: Role; saasRole?: SaaSRole; branchIds?: string[]; userType?: 'business' | 'saas' }): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.sub,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
      saasRole: user.saasRole,
      branchIds: user.branchIds,
      userType: user.userType || (user.businessId ? 'business' : 'saas'),
      typ: 'access',
    };

    const accessToken = await this.signAccessToken(payload);
    const expiresIn = this.parseTtlToSeconds(
      this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    );

    return { accessToken, expiresIn };
  }

  /**
   * Construye el DTO del usuario autenticado con su business + branches.
   */
  async buildAuthenticatedUserDto(userId: string): Promise<AuthenticatedUserDTO> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
        defaultBranch: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Filtrar branches según asignaciones UserBranch (FASE 2)
    const assignments = await this.prisma.userBranch.findMany({
      where: { userId: user.id },
      select: { branchId: true },
    });

    const assignedIds: string[] = assignments.map((a: { branchId: string }) => a.branchId);

    const branches = await this.prisma.branch.findMany({
      where: {
        businessId: user.businessId,
        status: 'ACTIVE',
        // Si el usuario tiene asignaciones explícitas, filtrar solo esas
        ...(assignments.length > 0 ? { id: { in: assignedIds } } : {}),
      },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      businessId: user.businessId,
      defaultBranchId: user.defaultBranchId,
      business: this.mapBusiness(user.business),
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
  }

  // ==================== HELPERS PRIVADOS ====================

  private async validateUser(
    businessSlug: string,
    email: string,
    password: string,
  ): Promise<{
    id: string;
    email: string;
    role: Role;
    businessId: string;
    status: string;
    passwordHash: string;
  } | null> {
    // 1. Resolver tenant
    const business = await this.prisma.business.findUnique({
      where: { slug: businessSlug },
    });
    if (!business) return null;
    if (business.status === 'SUSPENDED') {
      throw new UnauthorizedException('Negocio suspendido. Contacte al administrador.');
    }

    // 2. Buscar usuario dentro del tenant
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: {
        businessId_email: {
          businessId: business.id,
          email: normalizedEmail,
        },
      },
    });
    if (!user) return null;
    if (user.status !== 'ACTIVE') {
      // Permitir login solo a usuarios activos
      return null;
    }

    // 3. Comparar password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      status: user.status,
      passwordHash: user.passwordHash,
    };
  }

  private async resolveUserBranchIds(businessId: string, userId: string): Promise<string[]> {
    // FASE 2: Consultar asignaciones explícitas en UserBranch.
    // Si el usuario tiene registros en UserBranch, SOLO esas sucursales son accesibles.
    // Si NO tiene registros, asumimos acceso a TODAS las sucursales activas
    // (compatibilidad hacia atrás con Phase 1).
    const assignments = await this.prisma.userBranch.findMany({
      where: { userId },
      select: { branchId: true },
    });

    if (assignments.length > 0) {
      return assignments.map((a) => a.branchId);
    }

    // Sin asignaciones explícitas: todas las sucursales activas del business
    const branches = await this.prisma.branch.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: { id: true },
    });
    return branches.map((b) => b.id);
  }

  private async signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    return this.jwt.signAsync(payload, this.buildSignOptions('JWT_ACCESS_TTL', '15m', 'JWT_SECRET'));
  }

  private async signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    return this.jwt.signAsync(
      payload,
      this.buildSignOptions('JWT_REFRESH_TTL', '7d', 'JWT_REFRESH_SECRET'),
    );
  }

  /**
   * Construye las opciones de firma JWT.
   *
   * El cast a `never` en `expiresIn` es necesario porque `jsonwebtoken@9+`
   * tipa esa propiedad como `number | StringValue` (template literal de
   * el paquete `ms`). Los valores vienen de variables de entorno (string
   * general), por lo que TS no puede validar la asignación estáticamente.
   * En runtime la lib parsea correctamente strings como "15m" o "7d".
   */
  private buildSignOptions(ttlKey: string, defaultTtl: string, secretKey: string): JwtSignOptions {
    const secret = this.config.get<string>(secretKey);
    if (!secret) {
      throw new Error(`${secretKey} no está configurado`);
    }
    return {
      secret,
      expiresIn: this.config.get<string>(ttlKey, defaultTtl) as never,
    };
  }

  private parseTtlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])/.exec(ttl);
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2];
    if (!unit) return 900;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 60);
  }

  // ==================== SETUP (first admin) ====================

  async getSetupStatus(): Promise<{ needsSetup: boolean }> {
    const count = await this.prisma.saaSUser.count();
    return { needsSetup: count === 0 };
  }

  /**
   * Verifica si un business slug existe.
   * Endpoint público para que el frontend redirija al login o muestre not-found.
   */
  async checkBusiness(slug: string): Promise<{ exists: boolean }> {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });
    return { exists: business !== null };
  }

  async setup(email: string, password: string): Promise<{ id: string; email: string; role: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.saaSUser.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new BadRequestException('Ya existe un administrador con ese email');
    if (!email) throw new BadRequestException('Email requerido');
    if (!password || password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');

    const passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.saaSUser.create({
      data: { email: normalizedEmail, passwordHash, role: 'SUPER_ADMIN', fullName: 'Admin' },
      select: { id: true, email: true, role: true, status: true },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapBusiness(b: Record<string, any>): AuthenticatedUserDTO['business'] {
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      legalName: b.legalName,
      taxId: b.taxId,
      email: b.email,
      phone: b.phone,
      logoUrl: b.logoUrl,
      currency: b.currency,
      timezone: b.timezone,
      status: b.status as AuthenticatedUserDTO['business']['status'],
      plan: b.plan,
      trialEndsAt: b.trialEndsAt ? b.trialEndsAt.toISOString() : null,
      planId: b.planId,
      subscription: b.subscription
        ? {
            id: b.subscription.id,
            businessId: b.id,
            planId: b.subscription.planId,
            plan: b.subscription.plan
              ? {
                  id: b.subscription.plan.id,
                  code: b.subscription.plan.code,
                  name: b.subscription.plan.name,
                  description: b.subscription.plan.description,
                  price: b.subscription.plan.price.toString(),
                  currency: b.subscription.plan.currency,
                  billingPeriod: b.subscription.plan.billingPeriod as BillingPeriod,
                  maxUsers: b.subscription.plan.maxUsers,
                  maxBranches: b.subscription.plan.maxBranches,
                  maxProducts: b.subscription.plan.maxProducts,
                  maxCategories: b.subscription.plan.maxCategories,
                  maxMonthlyOrders: b.subscription.plan.maxMonthlyOrders,
                  maxStorageMb: b.subscription.plan.maxStorageMb,
                  features: b.subscription.plan.features as string[],
                  isActive: b.subscription.plan.isActive,
                  sortOrder: b.subscription.plan.sortOrder,
                  isPublic: b.subscription.plan.isPublic,
                  createdAt: b.subscription.plan.createdAt.toISOString(),
                  updatedAt: b.subscription.plan.updatedAt.toISOString(),
                }
              : null,
            status: b.subscription.status as SubscriptionStatus,
            currentPeriodStart: b.subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: b.subscription.currentPeriodEnd.toISOString(),
            trialEndsAt: b.subscription.trialEndsAt?.toISOString() ?? null,
            cancelledAt: b.subscription.cancelledAt?.toISOString() ?? null,
          }
        : null,
      moduleReports: b.moduleReports,
      moduleInventory: b.moduleInventory,
      modulePosStations: b.modulePosStations,
      moduleDeliveryApp: b.moduleDeliveryApp,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}
