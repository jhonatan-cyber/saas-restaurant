import type { Branch } from '@prisma/client';
import { toBranchDto } from './mappers';
import { dateToString } from '../common/mapper';

const mockDate = new Date('2025-06-01T12:00:00Z');

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 'branch-1',
    businessId: 'biz-1',
    name: 'Sucursal Centro',
    code: 'CENTRO',
    address: 'Av. Siempre Viva 742',
    phone: '+5411123456',
    isMain: true,
    status: 'ACTIVE',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  } as Branch;
}

function makeCounts(overrides: Partial<Record<string, number>> = {}) {
  return {
    categories: 10,
    products: 150,
    tables: 25,
    orders: 5,
    cashRegisters: 2,
    shifts: 1,
    posStations: 3,
    ...overrides,
  };
}

describe('toBranchDto', () => {
  it('maps all fields correctly', () => {
    const branch = makeBranch();
    const counts = makeCounts();
    const result = toBranchDto(branch, counts);

    expect(result).toEqual({
      id: 'branch-1',
      businessId: 'biz-1',
      name: 'Sucursal Centro',
      code: 'CENTRO',
      address: 'Av. Siempre Viva 742',
      phone: '+5411123456',
      isMain: true,
      status: 'ACTIVE',
      categoriesCount: 10,
      productsCount: 150,
      tablesCount: 25,
      activeOrdersCount: 5,
      openCashRegistersCount: 2,
      openShiftsCount: 1,
      activePosStationsCount: 3,
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });

  it('handles null address and phone', () => {
    const branch = makeBranch({ address: null, phone: null });
    const result = toBranchDto(branch, makeCounts());

    expect(result.address).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('handles non-main branch', () => {
    const branch = makeBranch({ isMain: false });
    const result = toBranchDto(branch, makeCounts());

    expect(result.isMain).toBe(false);
  });

  it('handles zero counts', () => {
    const branch = makeBranch();
    const result = toBranchDto(branch, makeCounts({
      categories: 0,
      products: 0,
      tables: 0,
      orders: 0,
      cashRegisters: 0,
      shifts: 0,
      posStations: 0,
    }));

    expect(result.categoriesCount).toBe(0);
    expect(result.productsCount).toBe(0);
    expect(result.tablesCount).toBe(0);
    expect(result.activeOrdersCount).toBe(0);
    expect(result.openCashRegistersCount).toBe(0);
    expect(result.openShiftsCount).toBe(0);
    expect(result.activePosStationsCount).toBe(0);
  });
});
