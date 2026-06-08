import type { PreparationArea } from '@prisma/client';
import type { PreparationAreaDTO } from '@saas/shared';
import { dateToString } from '../common/mapper';

export function toPreparationAreaDto(p: PreparationArea): PreparationAreaDTO {
  return {
    id: p.id,
    businessId: p.businessId,
    branchId: p.branchId,
    name: p.name,
    code: p.code,
    description: p.description,
    isActive: p.isActive,
    displayOrder: p.displayOrder,
    createdAt: dateToString(p.createdAt),
    updatedAt: dateToString(p.updatedAt),
  };
}
