import type { Supplier } from '@prisma/client';
import type { SupplierDTO } from '@saas/shared';
import { dateToString } from '../common/mapper';

export function toSupplierDto(s: Supplier, purchaseCount: number): SupplierDTO {
  return {
    id: s.id,
    businessId: s.businessId,
    branchId: s.branchId,
    name: s.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    address: s.address,
    taxId: s.taxId,
    notes: s.notes,
    isActive: s.isActive,
    purchaseCount,
    createdAt: dateToString(s.createdAt),
    updatedAt: dateToString(s.updatedAt),
  };
}
