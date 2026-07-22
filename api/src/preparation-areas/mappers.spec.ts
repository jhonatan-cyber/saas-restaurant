import type { PreparationArea } from '@prisma/client';
import { toPreparationAreaDto } from './mappers';
import { dateToString } from '../common/mapper';

const mockDate = new Date('2025-06-01T12:00:00Z');

function makeArea(overrides: Partial<PreparationArea> = {}): PreparationArea {
  return {
    id: 'area-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    name: 'Cocina',
    code: 'COC',
    description: 'Cocina principal',
    isActive: true,
    displayOrder: 1,
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  } as PreparationArea;
}

describe('toPreparationAreaDto', () => {
  it('maps all fields correctly', () => {
    const area = makeArea();
    const result = toPreparationAreaDto(area);

    expect(result).toEqual({
      id: 'area-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      name: 'Cocina',
      code: 'COC',
      description: 'Cocina principal',
      isActive: true,
      displayOrder: 1,
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });

  it('handles null description and branchId', () => {
    const area = makeArea({ description: null, branchId: null });
    const result = toPreparationAreaDto(area);

    expect(result.description).toBeNull();
    expect(result.branchId).toBeNull();
  });

  it('handles inactive state', () => {
    const area = makeArea({ isActive: false });
    const result = toPreparationAreaDto(area);

    expect(result.isActive).toBe(false);
  });

  it('reflects displayOrder', () => {
    expect(toPreparationAreaDto(makeArea({ displayOrder: 0 })).displayOrder).toBe(0);
    expect(toPreparationAreaDto(makeArea({ displayOrder: 10 })).displayOrder).toBe(10);
  });
});
