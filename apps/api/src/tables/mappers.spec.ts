import type { RestaurantTable } from '@prisma/client';
import { toTableDto } from './mappers';
import { dateToString } from '../common/mapper';

const mockDate = new Date('2025-06-01T12:00:00Z');

function makeTable(overrides: Partial<RestaurantTable> = {}): RestaurantTable {
  return {
    id: 'table-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    number: '5',
    capacity: 4,
    location: 'INDOOR',
    status: 'FREE',
    displayOrder: 1,
    notes: 'Cerca de la ventana',
    posX: 100,
    posY: 200,
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
    ...overrides,
  } as RestaurantTable;
}

describe('toTableDto', () => {
  it('maps all fields correctly', () => {
    const table = makeTable();
    const result = toTableDto(table);

    expect(result).toEqual({
      id: 'table-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      number: '5',
      capacity: 4,
      location: 'INDOOR',
      status: 'FREE',
      displayOrder: 1,
      notes: 'Cerca de la ventana',
      posX: 100,
      posY: 200,
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });

  it('handles null notes and position', () => {
    const table = makeTable({ notes: null, posX: null, posY: null });
    const result = toTableDto(table);

    expect(result.notes).toBeNull();
    expect(result.posX).toBeNull();
    expect(result.posY).toBeNull();
  });

  it('handles different locations', () => {
    const outdoor = toTableDto(makeTable({ location: 'OUTDOOR' }));
    expect(outdoor.location).toBe('OUTDOOR');

    const patio = toTableDto(makeTable({ location: 'PATIO' }));
    expect(patio.location).toBe('PATIO');
  });

  it('handles different statuses', () => {
    expect(toTableDto(makeTable({ status: 'FREE' })).status).toBe('FREE');
    expect(toTableDto(makeTable({ status: 'OCCUPIED' })).status).toBe('OCCUPIED');
    expect(toTableDto(makeTable({ status: 'RESERVED' })).status).toBe('RESERVED');
  });
});
