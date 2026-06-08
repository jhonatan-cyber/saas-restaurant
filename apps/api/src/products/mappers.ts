import { Prisma, ProductType } from '@prisma/client';
import type { ProductDTO, ProductListItemDTO } from '@saas/shared';
import { dateToString, decToString, decToNull } from '../common/mapper';
import { toCategoryDto } from '../categories/mappers';
import { toPreparationAreaDto } from '../preparation-areas/mappers';

/** Shape loaded by ProductsService with includes. */
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: {
      include: { _count: { select: { products: { where: { deletedAt: null } } } } };
    };
    preparationArea: true;
  };
}>;

export function toProductListItemDto(p: {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  imageUrl: string | null;
  price: Prisma.Decimal;
  cost: Prisma.Decimal | null;
  productType: ProductType;
  isAvailable: boolean;
}): ProductListItemDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    imageUrl: p.imageUrl,
    price: decToString(p.price),
    cost: decToNull(p.cost),
    productType: p.productType,
    isAvailable: p.isAvailable,
  };
}

export function toProductDto(p: ProductWithRelations): ProductDTO {
  return {
    id: p.id,
    businessId: p.businessId,
    branchId: p.branchId,
    categoryId: p.categoryId,
    preparationAreaId: p.preparationAreaId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    imageUrl: p.imageUrl,
    sku: p.sku,
    price: decToString(p.price),
    cost: decToNull(p.cost),
    taxRate: decToNull(p.taxRate),
    isActive: p.isActive,
    isAvailable: p.isAvailable,
    minStock: p.minStock,
    trackStock: p.trackStock,
    currentStock: decToString(p.currentStock),
    productType: p.productType,
    preparationTimeMin: p.preparationTimeMin,
    category: p.category
      ? toCategoryDto(p.category, p.category._count.products)
      : null,
    preparationArea: p.preparationArea
      ? toPreparationAreaDto(p.preparationArea)
      : null,
    createdAt: dateToString(p.createdAt),
    updatedAt: dateToString(p.updatedAt),
  };
}
