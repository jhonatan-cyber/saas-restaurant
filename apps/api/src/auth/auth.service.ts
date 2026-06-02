import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import type { Role } from '@saas/shared';
import type { LoginResponseDTO, JwtPayload, AuthenticatedUserDTO } from '@saas/shared';
import type { LoginDto } from './dto/login.dto';

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
   * Login principal.
   * Devuelve { accessToken, refreshToken, user }.
   */
  async login(dto: LoginDto): Promise<LoginResponseDTO> {
    const user = await this.validateUser(dto.businessSlug, dto.email, dto.password);
    if (!user) {
      // Mensaje genérico para no filtrar si el tenant o el email existen.
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Determinar branchIds del usuario (todas las del business por ahora;
    // se puede restringir por tabla UserBranch en fases futuras).
    const branchIds = await this.resolveUserBranchIds(user.businessId, user.id);

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
      branchIds,
      typ: 'access',
    };

    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload);

    // Actualizar lastLoginAt (best-effort: no romper el login si falla)
    await this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch((err: unknown) => {
        this.logger.warn(`No se pudo actualizar lastLoginAt: ${String(err)}`);
      });

    const userDto = await this.buildAuthenticatedUserDto(user.id);

    return {
      accessToken,
      refreshToken,
      user: userDto,
    };
  }

  /**
   * Refresh: recibe el refresh token (validado por JwtRefreshStrategy),
   * emite un nuevo access token con el mismo payload.
   */
  async refresh(user: { sub: string; email: string; businessId: string; role: Role; branchIds: string[] }): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.sub,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
      branchIds: user.branchIds,
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
        business: true,
        defaultBranch: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const branches = await this.prisma.branch.findMany({
      where: { businessId: user.businessId, status: 'ACTIVE' },
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
    // Phase 1: todos los usuarios ven todas las sucursales activas de su business.
    // Phase 2+: aquí se consultará la tabla UserBranch para permisos granulares.
    const branches = await this.prisma.branch.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: { id: true },
    });
    // userId queda en la firma para uso futuro
    void userId;
    return branches.map((b) => b.id);
  }

  private async signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    });
  }

  private async signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
    });
  }

  private parseTtlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])/.exec(ttl);
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 60);
  }

  private mapBusiness(b: {
    id: string;
    name: string;
    slug: string;
    legalName: string | null;
    taxId: string | null;
    email: string;
    phone: string | null;
    logoUrl: string | null;
    currency: string;
    timezone: string;
    status: string;
    plan: string;
    trialEndsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AuthenticatedUserDTO['business'] {
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
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}
