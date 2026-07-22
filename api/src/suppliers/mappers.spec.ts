import type { Supplier } from '@prisma/client';
import { toSupplierDto } from './mappers';
import { dateToString } from '../common/mapper';

const mockDate = new Date('2025-06-01T12:00:00Z');

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 'supp-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    name: 'Distribuidora ABC',
    contactName: 'Juan Pérez',
    email: 'juan@distabc.com',
    phone: '+5411123456',
    address: 'Av. Comercio 123',
    taxId: '30-12345678-9',
    notes: 'Proveedor confiable',
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
    ...overrides,
  } as Supplier;
}

describe('toSupplierDto', () => {
  it('maps all fields correctly', () => {
    const supplier = makeSupplier();
    const result = toSupplierDto(supplier, 25);

    expect(result).toEqual({
      id: 'supp-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      name: 'Distribuidora ABC',
      contactName: 'Juan Pérez',
      email: 'juan@distabc.com',
      phone: '+5411123456',
      address: 'Av. Comercio 123',
      taxId: '30-12345678-9',
      notes: 'Proveedor confiable',
      isActive: true,
      purchaseCount: 25,
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });

  it('handles null optional fields', () => {
    const supplier = makeSupplier({
      contactName: null,
      email: null,
      phone: null,
      address: null,
      taxId: null,
      notes: null,
      branchId: null,
    });
    const result = toSupplierDto(supplier, 0);

    expect(result.contactName).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.taxId).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.branchId).toBeNull();
  });

  it('reflects isActive', () => {
    expect(toSupplierDto(makeSupplier({ isActive: false }), 0).isActive).toBe(false);
    expect(toSupplierDto(makeSupplier({ isActive: true }), 0).isActive).toBe(true);
  });

  it('uses provided purchaseCount', () => {
    expect(toSupplierDto(makeSupplier(), 0).purchaseCount).toBe(0);
    expect(toSupplierDto(makeSupplier(), 99).purchaseCount).toBe(99);
  });
});
