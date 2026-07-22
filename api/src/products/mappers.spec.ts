import { ProductType } from '@prisma/client';
import { toProductListItemDto, toProductDto, parseComboItems, type ProductWithRelations } from './mappers';
import { dateToString } from '../common/mapper';
import { decimal } from '../test/mocks';

const mockDate = new Date('2025-06-01T12:00:00Z');

// ─── toProductListItemDto ──────────────────────────────────

describe('toProductListItemDto', () => {
  it('maps all fields correctly', () => {
    const input = {
      id: 'prod-1',
      name: 'Coca Cola',
      slug: 'coca-cola',
      categoryId: 'cat-1',
      imageUrl: 'https://example.com/coca.png',
      price: decimal(2.50),
      cost: decimal(1.20),
      productType: ProductType.SALE,
      isAvailable: true,
    };

    const result = toProductListItemDto(input);

    expect(result).toEqual({
      id: 'prod-1',
      name: 'Coca Cola',
      slug: 'coca-cola',
      categoryId: 'cat-1',
      imageUrl: 'https://example.com/coca.png',
      price: '2.5',
      cost: '1.2',
      productType: ProductType.SALE,
      isAvailable: true,
    });
  });

  it('handles nullable cost', () => {
    const input = {
      id: 'prod-2',
      name: 'Service Fee',
      slug: 'service-fee',
      categoryId: null,
      imageUrl: null,
      price: decimal(10),
      cost: null,
      productType: ProductType.SERVICE,
      isAvailable: true,
    };

    const result = toProductListItemDto(input);

    expect(result.cost).toBeNull();
    expect(result.categoryId).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.price).toBe('10');
  });
});

// ─── toProductDto ───────────────────────────────────────────

describe('toProductDto', () => {
  const makeProduct = (overrides: Partial<ProductWithRelations> = {}): ProductWithRelations => ({
    id: 'prod-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    categoryId: 'cat-1',
    preparationAreaId: 'area-1',
    name: 'Coca Cola',
    slug: 'coca-cola',
    description: 'Bebida gaseosa 355ml',
    imageUrl: 'https://example.com/coca.png',
    sku: 'COCA-355',
    price: decimal(2.50),
    cost: decimal(1.20),
    taxRate: decimal(0.18),
    isActive: true,
    isAvailable: true,
    minStock: 10,
    trackStock: true,
    currentStock: decimal(50),
    productType: ProductType.SALE,
    preparationTimeMin: 2,
    category: {
      id: 'cat-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      name: 'Bebidas',
      slug: 'bebidas',
      description: null,
      imageUrl: null,
      displayOrder: 1,
      isActive: true,
      createdAt: mockDate,
      updatedAt: mockDate,
      deletedAt: null,
      _count: { products: 15 },
    },
    preparationArea: {
      id: 'area-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      name: 'Barra',
      code: 'BAR',
      description: 'Área de barra',
      isActive: true,
      displayOrder: 1,
      createdAt: mockDate,
      updatedAt: mockDate,
    },
    createdAt: mockDate,
    updatedAt: mockDate,
    deletedAt: null,
    ...overrides,
  } as unknown as ProductWithRelations);

  it('maps all scalar fields correctly', () => {
    const p = makeProduct();
    const result = toProductDto(p);

    expect(result.id).toBe('prod-1');
    expect(result.businessId).toBe('biz-1');
    expect(result.name).toBe('Coca Cola');
    expect(result.price).toBe('2.5');
    expect(result.cost).toBe('1.2');
    expect(result.taxRate).toBe('0.18');
    expect(result.currentStock).toBe('50');
  });

  it('maps nested category', () => {
    const p = makeProduct();
    const result = toProductDto(p);

    expect(result.category).not.toBeNull();
    expect(result.category!.id).toBe('cat-1');
    expect(result.category!.name).toBe('Bebidas');
    expect(result.category!.productCount).toBe(15);
    expect(result.category!.createdAt).toBe(dateToString(mockDate));
  });

  it('maps nested preparationArea', () => {
    const p = makeProduct();
    const result = toProductDto(p);

    expect(result.preparationArea).not.toBeNull();
    expect(result.preparationArea!.id).toBe('area-1');
    expect(result.preparationArea!.name).toBe('Barra');
    expect(result.preparationArea!.code).toBe('BAR');
  });

  it('handles null category and preparationArea', () => {
    const p = makeProduct({ category: null, preparationArea: null } as any);
    const result = toProductDto(p);

    expect(result.category).toBeNull();
    expect(result.preparationArea).toBeNull();
  });

  it('handles nullable decimal fields', () => {
    const p = makeProduct({ cost: null, taxRate: null } as any);
    const result = toProductDto(p);

    expect(result.cost).toBeNull();
    expect(result.taxRate).toBeNull();
  });

  it('converts createdAt and updatedAt to ISO strings', () => {
    const p = makeProduct();
    const result = toProductDto(p);

    expect(result.createdAt).toBe(dateToString(mockDate));
    expect(result.updatedAt).toBe(dateToString(mockDate));
  });

  it('maps comboItems array from Prisma JSON', () => {
    const comboItems = [
      { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
      { productId: 'child-2', productName: 'Papas Fritas', quantity: 1 },
    ];
    const p = makeProduct({ comboItems: comboItems as any });
    const result = toProductDto(p);

    expect(result.comboItems).toHaveLength(2);
    const items = result.comboItems!;
    expect(items[0]!.productName).toBe('Hamburguesa');
    expect(items[0]!.quantity).toBe(1);
    expect(items[1]!.productName).toBe('Papas Fritas');
  });

  it('maps comboItems as null when Prisma JSON is null', () => {
    const p = makeProduct({ comboItems: null as any });
    const result = toProductDto(p);

    expect(result.comboItems).toBeNull();
  });

  it('maps comboItems as null when Prisma JSON is undefined', () => {
    const p = makeProduct({ comboItems: undefined as any });
    const result = toProductDto(p);

    expect(result.comboItems).toBeNull();
  });
});

// ─── parseComboItems ─────────────────────────────────────────

describe('parseComboItems', () => {
  it('returns null for null input', () => {
    expect(parseComboItems(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseComboItems(undefined)).toBeNull();
  });

  it('returns null for non-array input', () => {
    expect(parseComboItems('not-an-array')).toBeNull();
    expect(parseComboItems(42)).toBeNull();
    expect(parseComboItems({})).toBeNull();
  });

  it('parses a valid array of combo items', () => {
    const input = [
      { productId: 'child-1', productName: 'Hamburguesa', quantity: 2 },
      { productId: 'child-2', productName: 'Papas Fritas', quantity: 1 },
    ];

    const result = parseComboItems(input);

    expect(result).toHaveLength(2);
    const items = result!;
    expect(items[0]!).toEqual({ productId: 'child-1', productName: 'Hamburguesa', quantity: 2 });
    expect(items[1]!).toEqual({ productId: 'child-2', productName: 'Papas Fritas', quantity: 1 });
  });

  it('coerces missing fields to defaults', () => {
    const input = [
      { productId: 'child-1' },
      { productName: 'Solo nombre' },
      {},
    ];

    const result = parseComboItems(input);

    expect(result).toHaveLength(3);
    const items = result!;
    expect(items[0]!).toEqual({ productId: 'child-1', productName: '', quantity: 1 });
    expect(items[1]!).toEqual({ productId: '', productName: 'Solo nombre', quantity: 1 });
    expect(items[2]!).toEqual({ productId: '', productName: '', quantity: 1 });
  });

  it('handles numeric quantity strings', () => {
    const input = [{ productId: 'child-1', productName: 'Item', quantity: '3' }];

    const result = parseComboItems(input);

    expect(result).not.toBeNull();
    const items = result!;
    expect(items[0]!.quantity).toBe(3);
  });

  it('returns empty array for empty array input', () => {
    const result = parseComboItems([]);
    expect(result).toEqual([]);
  });
});
