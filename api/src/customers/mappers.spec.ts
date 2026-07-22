import type { Customer } from '@prisma/client';
import { toCustomerDto } from './mappers';
import { dateToString } from '../common/mapper';
import { decimal } from '../test/mocks';

const mockDate = new Date('2025-06-01T12:00:00Z');

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    businessId: 'biz-1',
    name: 'Carlos López',
    taxId: '20-12345678-9',
    taxIdType: 'CUIT',
    email: 'carlos@email.com',
    phone: '+5411555666',
    address: 'Calle Falsa 123',
    addressReference: 'Casa blanca',
    latitude: decimal(-34.6037),
    longitude: decimal(-58.3816),
    notes: 'Cliente frecuente',
    isActive: true,
    totalOrders: 15,
    totalSpent: decimal(450.75),
    lastOrderAt: mockDate,
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
    ...overrides,
  } as Customer;
}

describe('toCustomerDto', () => {
  it('maps all fields correctly', () => {
    const customer = makeCustomer();
    const result = toCustomerDto(customer);

    expect(result).toEqual({
      id: 'cust-1',
      businessId: 'biz-1',
      name: 'Carlos López',
      taxId: '20-12345678-9',
      taxIdType: 'CUIT',
      email: 'carlos@email.com',
      phone: '+5411555666',
      address: 'Calle Falsa 123',
      addressReference: 'Casa blanca',
      latitude: '-34.6037',
      longitude: '-58.3816',
      notes: 'Cliente frecuente',
      isActive: true,
      totalOrders: 15,
      totalSpent: '450.75',
      lastOrderAt: dateToString(mockDate),
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });

  it('handles null optional fields', () => {
    const customer = makeCustomer({
      taxId: null,
      taxIdType: null,
      email: null,
      phone: null,
      address: null,
      addressReference: null,
      latitude: null,
      longitude: null,
      notes: null,
      lastOrderAt: null,
    });
    const result = toCustomerDto(customer);

    expect(result.taxId).toBeNull();
    expect(result.taxIdType).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.addressReference).toBeNull();
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.lastOrderAt).toBeNull();
  });

  it('handles zero orders and zero spent', () => {
    const customer = makeCustomer({
      totalOrders: 0,
      totalSpent: decimal(0),
      lastOrderAt: null,
    });
    const result = toCustomerDto(customer);

    expect(result.totalOrders).toBe(0);
    expect(result.totalSpent).toBe('0');
    expect(result.lastOrderAt).toBeNull();
  });

  it('reflects isActive', () => {
    expect(toCustomerDto(makeCustomer({ isActive: false })).isActive).toBe(false);
    expect(toCustomerDto(makeCustomer({ isActive: true })).isActive).toBe(true);
  });

  it('converts dates to ISO strings', () => {
    const customer = makeCustomer();
    const result = toCustomerDto(customer);

    expect(result.createdAt).toBe(dateToString(mockDate));
    expect(result.updatedAt).toBe(dateToString(mockDate));
  });
});
