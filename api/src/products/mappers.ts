import { Prisma, ProductType } from '@prisma/client';
import type { ComboItemDTO, BulkPricingTierDTO } from '@saas/shared';
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

/**
 * Parsea el JSON de bulkPricing desde Prisma.
 */
export function parseBulkPricing(json: unknown): BulkPricingTierDTO[] | null {
  if (!json) return null;
  if (Array.isArray(json)) {
    return json.map((item: Record<string, unknown>) => ({
      minQty: Number(item.minQty ?? 2),
      unitPrice: Number(item.unitPrice ?? 0),
    }));
  }
  return null;
}

/**
 * Parsea el JSON de comboItems desde Prisma.
 */
export function parseComboItems(json: unknown): ComboItemDTO[] | null {
  if (!json) return null;
  if (Array.isArray(json)) {
    return json.map((item: Record<string, unknown>) => ({
      productId: String(item.productId ?? ''),
      productName: String(item.productName ?? ''),
      quantity: Number(item.quantity ?? 1),
    }));
  }
  return null;
}

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
    comboItems: parseComboItems(p.comboItems),
    bulkPricing: parseBulkPricing(p.bulkPricing),
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
