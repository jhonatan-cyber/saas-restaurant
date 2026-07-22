import { Prisma } from '@prisma/client';
import type { ReportDTO } from '@saas/shared';
import { dateToString, dateToNull } from '../common/mapper';

export interface ReportRow {
  id: string;
  businessId: string;
  type: string;
  format: string;
  status: string;
  params: Prisma.JsonValue;
  resultUrl: string | null;
  resultSize: number | null;
  errorMessage: string | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toReportDto(r: ReportRow): ReportDTO {
  return {
    id: r.id,
    businessId: r.businessId,
    type: r.type as ReportDTO['type'],
    format: r.format as ReportDTO['format'],
    status: r.status as ReportDTO['status'],
    params: r.params as Record<string, unknown>,
    resultUrl: r.resultUrl,
    resultSize: r.resultSize,
    errorMessage: r.errorMessage,
    completedAt: dateToNull(r.completedAt),
    expiresAt: dateToNull(r.expiresAt),
    requestedBy: r.requestedBy,
    createdAt: dateToString(r.createdAt),
    updatedAt: dateToString(r.updatedAt),
  };
}
