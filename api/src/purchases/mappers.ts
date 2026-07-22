import { Prisma } from '@prisma/client';
import type { Purchase, PurchaseItem } from '@prisma/client';
import type { PurchaseDTO, PurchaseListItemDTO, PurchaseItemDTO } from '@saas/shared';
import { dateToString, dateToNull, decToString } from '../common/mapper';
import { toSupplierDto } from '../suppliers/mappers';

/** Full purchase with supplier + items includes. */
export type PurchaseWithRelations = Purchase & {
  supplier?: {
    id: string;
    businessId: string;
    branchId: string | null;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    taxId: string | null;
    notes: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  items: PurchaseItem[];
};

export function toPurchaseListItemDto(
  p: {
    id: string;
    purchaseNumber: string;
    status: string;
    total: Prisma.Decimal | string | number;
    createdAt: Date;
    supplier?: { id: string; name: string } | null;
    items: { id: string; productName: string; quantity: Prisma.Decimal | string | number; lineTotal: Prisma.Decimal | string | number }[];
  },
): PurchaseListItemDTO {
  return {
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    supplierName: p.supplier?.name ?? null,
    status: p.status as PurchaseListItemDTO['status'],
    total: decToString(p.total),
    itemCount: p.items.length,
    createdAt: dateToString(p.createdAt),
  };
}

export function toPurchaseItemDto(i: PurchaseItem): PurchaseItemDTO {
  return {
    id: i.id,
    purchaseId: i.purchaseId,
    productId: i.productId,
    productName: i.productName,
    unitCost: decToString(i.unitCost),
    quantity: decToString(i.quantity),
    lineTotal: decToString(i.lineTotal),
    createdAt: dateToString(i.createdAt),
  };
}

export function toPurchaseDto(p: PurchaseWithRelations): PurchaseDTO {
  return {
    id: p.id,
    businessId: p.businessId,
    branchId: p.branchId,
    supplierId: p.supplierId,
    purchaseNumber: p.purchaseNumber,
    status: p.status as PurchaseDTO['status'],
    subtotal: decToString(p.subtotal),
    taxTotal: decToString(p.taxTotal),
    total: decToString(p.total),
    notes: p.notes,
    receivedAt: dateToNull(p.receivedAt),
    receivedBy: p.receivedBy,
    invoiceUrl: p.invoiceUrl,
    createdById: p.createdById,
    supplier: p.supplier
      ? toSupplierDto(p.supplier as any, 0)
      : null,
    items: (p.items ?? []).map(toPurchaseItemDto),
    createdAt: dateToString(p.createdAt),
    updatedAt: dateToString(p.updatedAt),
  };
}
