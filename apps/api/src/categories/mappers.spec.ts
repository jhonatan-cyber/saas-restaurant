import type { Category } from '@prisma/client';
import { toCategoryDto } from './mappers';
import { dateToString } from '../common/mapper';

const mockDate = new Date('2025-06-01T12:00:00Z');

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    name: 'Bebidas',
    slug: 'bebidas',
    description: 'Bebidas frías y calientes',
    imageUrl: 'https://example.com/bebidas.png',
    displayOrder: 1,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
    ...overrides,
  } as Category;
}

describe('toCategoryDto', () => {
  it('maps all fields correctly', () => {
    const cat = makeCategory();
    const result = toCategoryDto(cat, 5);

    expect(result).toEqual({
      id: 'cat-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      name: 'Bebidas',
      slug: 'bebidas',
      description: 'Bebidas frías y calientes',
      imageUrl: 'https://example.com/bebidas.png',
      displayOrder: 1,
      isActive: true,
      productCount: 5,
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });

  it('handles null optional fields', () => {
    const cat = makeCategory({
      description: null,
      imageUrl: null,
      branchId: null,
    });
    const result = toCategoryDto(cat, 0);

    expect(result.description).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.branchId).toBeNull();
    expect(result.productCount).toBe(0);
  });

  it('converts dates to ISO strings', () => {
    const cat = makeCategory();
    const result = toCategoryDto(cat, 0);

    expect(result.createdAt).toBe('2025-06-01T12:00:00.000Z');
    expect(result.updatedAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('uses the provided productCount', () => {
    const cat = makeCategory();
    expect(toCategoryDto(cat, 10).productCount).toBe(10);
    expect(toCategoryDto(cat, 0).productCount).toBe(0);
    expect(toCategoryDto(cat, 999).productCount).toBe(999);
  });

  it('copies displayOrder and isActive faithfully', () => {
    const cat = makeCategory({ displayOrder: 5, isActive: false });
    const result = toCategoryDto(cat, 0);

    expect(result.displayOrder).toBe(5);
    expect(result.isActive).toBe(false);
  });
});
