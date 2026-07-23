import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, $Enums } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePlanDto, UpdatePlanDto, PlanFiltersDto } from './dto/plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un plan con código "${dto.code}"`);
    }

    return this.prisma.plan.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        price: dto.price,
        currency: dto.currency,
        billingPeriod: dto.billingPeriod as $Enums.BillingPeriod,
        maxUsers: dto.maxUsers,
        maxBranches: dto.maxBranches,
        maxProducts: dto.maxProducts,
        maxCategories: dto.maxCategories,
        maxMonthlyOrders: dto.maxMonthlyOrders,
        maxStorageMb: dto.maxStorageMb,
        features: dto.features ?? [],
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        isPublic: dto.isPublic ?? true,
      },
    });
  }

  async list(filters: PlanFiltersDto) {
    const page = Number(filters.page) || 1;
    const pageSize = Number(filters.pageSize) || 20;
    const { search, isActive } = filters;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PlanWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async listPublic() {
    return this.prisma.plan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getById(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    if (dto.code) {
      const dup = await this.prisma.plan.findUnique({
        where: { code: dto.code.toUpperCase().trim() },
      });
      if (dup && dup.id !== id) {
        throw new BadRequestException(`Ya existe otro plan con código "${dto.code}"`);
      }
    }

    const data: Prisma.PlanUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase().trim();
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.billingPeriod !== undefined) data.billingPeriod = dto.billingPeriod as $Enums.BillingPeriod;
    if (dto.maxUsers !== undefined) data.maxUsers = dto.maxUsers;
    if (dto.maxBranches !== undefined) data.maxBranches = dto.maxBranches;
    if (dto.maxProducts !== undefined) data.maxProducts = dto.maxProducts;
    if (dto.maxCategories !== undefined) data.maxCategories = dto.maxCategories;
    if (dto.maxMonthlyOrders !== undefined) data.maxMonthlyOrders = dto.maxMonthlyOrders;
    if (dto.maxStorageMb !== undefined) data.maxStorageMb = dto.maxStorageMb;
    if (dto.features !== undefined) data.features = dto.features;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;

    return this.prisma.plan.update({ where: { id }, data });
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const subsCount = await this.prisma.subscription.count({
      where: { planId: id },
    });
    if (subsCount > 0) {
      // Soft-deactivate instead of hard delete
      return this.prisma.plan.update({
        where: { id },
        data: { isActive: false },
        select: { id: true, code: true, isActive: true },
      });
    }

    await this.prisma.plan.delete({ where: { id } });
    return { id, deleted: true };
  }
}
