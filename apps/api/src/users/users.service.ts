import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Role } from '@saas/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto, UpdateUserDto, UserFiltersDto } from './dto/users.dto';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca un usuario por id.
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { business: true, defaultBranch: true },
    });
  }

  /**
   * Busca un usuario dentro de un tenant específico (multi-tenant).
   */
  async findByEmailInBusiness(businessId: string, email: string) {
    return this.prisma.user.findUnique({
      where: {
        businessId_email: {
          businessId,
          email: email.toLowerCase().trim(),
        },
      },
    });
  }

  /**
   * Lista usuarios de un tenant (Phase 2).
   */
  async listByBusiness(businessId: string) {
    return this.prisma.user.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Verifica si el usuario tiene alguno de los roles (Phase 2+).
   */
  hasAnyRole(userRole: Role, allowedRoles: readonly Role[]): boolean {
    return allowedRoles.includes(userRole);
  }

  // ============ CRUD de gestión de usuarios ============

  /**
   * Crear un usuario en el negocio.
   * Asigna status ACTIVE (no INVITED) porque ya se le asigna contraseña.
   */
  async create(actor: AuthenticatedUser, businessId: string, dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.findByEmailInBusiness(businessId, email);
    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese email en el negocio');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() ?? null,
        role: dto.role,
        status: 'ACTIVE',
        businessId,
        defaultBranchId: dto.defaultBranchId ?? null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        defaultBranchId: true,
        createdAt: true,
      },
    });
  }

  /**
   * Listar usuarios del negocio (paginado + filtros).
   */
  async list(businessId: string, filters: UserFiltersDto) {
    const { page = 1, pageSize = 20, search, role, status } = filters;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = { businessId };

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          defaultBranchId: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Obtener un usuario por ID (verifica que pertenezca al business del actor).
   */
  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        businessId: true,
        defaultBranchId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /**
   * Actualizar datos del usuario (excepto contraseña, que tiene su propio endpoint).
   */
  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.businessId !== actor.businessId) {
      throw new NotFoundException('Usuario no encontrado en este negocio');
    }

    const data: Prisma.UserUncheckedUpdateInput = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() ?? null;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.defaultBranchId !== undefined) data.defaultBranchId = dto.defaultBranchId ?? null;
    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      const existing = await this.findByEmailInBusiness(actor.businessId, email);
      if (existing && existing.id !== id) {
        throw new BadRequestException('Ya existe otro usuario con ese email');
      }
      data.email = email;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        defaultBranchId: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Desactivar (borrado lógico) un usuario.
   */
  async inactivate(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: { id: true, status: true },
    });
  }
}
