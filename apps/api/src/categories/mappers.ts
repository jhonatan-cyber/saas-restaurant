import type { Category } from '@prisma/client';
import type { CategoryDTO } from '@saas/shared';
import { dateToString } from '../common/mapper';

export function toCategoryDto(c: Category, productCount: number): CategoryDTO {
  return {
    id: c.id,
    businessId: c.businessId,
    branchId: c.branchId,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    productCount,
    createdAt: dateToString(c.createdAt),
    updatedAt: dateToString(c.updatedAt),
  };
}
