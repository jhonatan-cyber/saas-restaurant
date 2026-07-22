import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportGeneratorFactory } from './generators/report-generator.factory';
import { ReportStorageService } from './storage/report-storage.service';
import type { ReportContext } from './generators/report-generator.interface';

export interface ReportJobData {
  reportId: string;
  businessId: string;
  type: string;
  format: string;
  params: Record<string, unknown>;
}

@Processor('reports', {
  concurrency: 2,
})
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly factory: ReportGeneratorFactory,
    private readonly storage: ReportStorageService,
  ) {
    super();
  }

  async process(job: Job<ReportJobData, void, string>): Promise<void> {
    const { reportId, businessId, type, format, params } = job.data;

    this.logger.log(`Procesando reporte ${reportId}: ${type} en formato ${format}`);

    // 1. Marcar como PROCESSING
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.PROCESSING },
    });

    try {
      // 2. Obtener el generador
      const generator = this.factory.getGenerator(type);

      // 3. Generar el contenido
      const ctx: ReportContext = {
        businessId,
        params,
        format: format as any,
        prisma: this.prisma,
      };
      const buffer = await generator.generate(ctx);

      // 4. Guardar en storage
      const { url, size } = await this.storage.store(businessId, reportId, format, buffer);

      // 5. Marcar como COMPLETED
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.COMPLETED,
          resultUrl: url,
          resultSize: size,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Reporte ${reportId} completado: ${url}`);
    } catch (error) {
      this.logger.error(`Error generando reporte ${reportId}:`, error);

      // Marcar como FAILED
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        },
      });
    }
  }
}
