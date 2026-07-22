import type { ReportFormat } from '@saas/shared';
import type { PrismaService } from '../../prisma/prisma.service';

export interface ReportContext {
  businessId: string;
  params: Record<string, unknown>;
  format: ReportFormat;
  prisma: PrismaService;
}

export interface IReportGenerator {
  readonly type: string;
  generate(ctx: ReportContext): Promise<Buffer>;
}
