import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import type { ReportDTO } from '@saas/shared';
import { toReportDto, type ReportRow } from './mappers';
import { RequestReportDto, type ReportFiltersDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reports') private readonly reportsQueue: Queue,
  ) {}

  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: ReportFiltersDto,
  ): Promise<{ data: ReportDTO[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const businessId = context?.businessId ?? user.businessId;

    const where: Prisma.ReportWhereInput = {
      businessId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((r) => toReportDto(r)),
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
  ): Promise<ReportDTO> {
    const businessId = context?.businessId ?? user.businessId;
    const report = await this.prisma.report.findFirst({
      where: { businessId, id },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return toReportDto(report);
  }

  /**
   * Solicita un reporte: guarda en DB como PENDING y lo encola en BullMQ.
   * El worker ReportsProcessor lo procesa en background.
   */
  async request(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: RequestReportDto,
  ): Promise<ReportDTO> {
    const businessId = context?.businessId ?? user.businessId;

    const created = await this.prisma.report.create({
      data: {
        businessId,
        requestedBy: user.id,
        type: dto.type,
        format: dto.format ?? 'PDF',
        status: ReportStatus.PENDING,
        params: (dto.params ?? {}) as Prisma.JsonObject,
      },
    });

    // Encolar en BullMQ (fire & forget — si falla el queue el reporte queda PENDING)
    try {
      await this.reportsQueue.add(
        dto.type,
        {
          reportId: created.id,
          businessId,
          type: dto.type,
          format: dto.format ?? 'PDF',
          params: dto.params ?? {},
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    } catch (error) {
      this.logger.error(`Error al encolar reporte ${created.id}:`, error);
      // No relanzamos: el reporte queda PENDING y puede reintentarse
    }

    return toReportDto(created);
  }

  // toDto moved to ./mappers.ts — imported as toReportDto

}
