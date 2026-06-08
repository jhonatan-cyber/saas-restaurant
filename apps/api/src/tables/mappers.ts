import type { RestaurantTable } from '@prisma/client';
import type { TableDTO } from '@saas/shared';
import { dateToString } from '../common/mapper';

export function toTableDto(t: RestaurantTable): TableDTO {
  return {
    id: t.id,
    businessId: t.businessId,
    branchId: t.branchId,
    number: t.number,
    capacity: t.capacity,
    location: t.location,
    status: t.status,
    displayOrder: t.displayOrder,
    notes: t.notes,
    posX: t.posX,
    posY: t.posY,
    createdAt: dateToString(t.createdAt),
    updatedAt: dateToString(t.updatedAt),
  };
}
