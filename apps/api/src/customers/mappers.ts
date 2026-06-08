import type { Customer } from '@prisma/client';
import type { CustomerDTO } from '@saas/shared';
import { dateToString, dateToNull, decToNull } from '../common/mapper';

export function toCustomerDto(c: Customer): CustomerDTO {
  return {
    id: c.id,
    businessId: c.businessId,
    name: c.name,
    taxId: c.taxId,
    taxIdType: c.taxIdType,
    email: c.email,
    phone: c.phone,
    address: c.address,
    addressReference: c.addressReference,
    latitude: decToNull(c.latitude),
    longitude: decToNull(c.longitude),
    notes: c.notes,
    isActive: c.isActive,
    totalOrders: c.totalOrders,
    totalSpent: c.totalSpent.toString(),
    lastOrderAt: dateToNull(c.lastOrderAt),
    createdAt: dateToString(c.createdAt),
    updatedAt: dateToString(c.updatedAt),
  };
}
