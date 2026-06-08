import type { Branch } from '@prisma/client';
import type { BranchDTO } from '@saas/shared';
import { dateToString } from '../common/mapper';

export interface BranchCounts {
  categories: number;
  products: number;
  tables: number;
  orders: number;
  cashRegisters: number;
  shifts: number;
  posStations: number;
}

export function toBranchDto(
  b: Branch,
  counts: BranchCounts,
): BranchDTO {
  return {
    id: b.id,
    businessId: b.businessId,
    name: b.name,
    code: b.code,
    address: b.address,
    phone: b.phone,
    isMain: b.isMain,
    status: b.status as BranchDTO['status'],
    categoriesCount: counts.categories,
    productsCount: counts.products,
    tablesCount: counts.tables,
    activeOrdersCount: counts.orders,
    openCashRegistersCount: counts.cashRegisters,
    openShiftsCount: counts.shifts,
    activePosStationsCount: counts.posStations,
    createdAt: dateToString(b.createdAt),
    updatedAt: dateToString(b.updatedAt),
  };
}
