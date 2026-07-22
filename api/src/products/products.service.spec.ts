import { ProductsService } from './products.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createTestUser, createTestContext, decimal } from '../test/mocks';
import { buildServiceTest, MockPrisma, MockAudit, MockCache } from '../test/service-test.helper';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: MockPrisma;
  let audit: MockAudit;
  let cache: MockCache;

  const user = createTestUser();
  const context = createTestContext();

  const baseProduct = {
    id: 'prod-1',
    businessId: 'biz-1',
    branchId: null,
    name: 'Hamburguesa',
    slug: 'hamburguesa',
    description: null,
    imageUrl: null,
    categoryId: 'cat-1',
    preparationAreaId: 'area-1',
    sku: 'HAM-001',
    price: decimal(100),
    cost: decimal(50),
    taxRate: decimal(21),
    trackStock: false,
    minStock: null,
    productType: 'SALE' as const,
    preparationTimeMin: null,
    isActive: true,
    isAvailable: true,
    currentStock: decimal(0),
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    category: {
      id: 'cat-1',
      businessId: 'biz-1',
      name: 'Comidas',
      slug: 'comidas',
      description: null,
      imageUrl: null,
      displayOrder: 1,
      isActive: true,
      branchId: null,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      _count: { products: 5 },
    },
    preparationArea: {
      id: 'area-1',
      name: 'Cocina',
      code: 'KITCHEN',
      description: null,
      branchId: 'branch-1',
      displayOrder: 1,
      isActive: true,
      businessId: 'biz-1',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  };

  const baseCategory = {
    id: 'cat-1',
    businessId: 'biz-1',
    branchId: null,
    name: 'Comidas',
    slug: 'comidas',
    description: null,
    imageUrl: null,
    displayOrder: 1,
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const baseArea = {
    id: 'area-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    name: 'Cocina',
    code: 'KITCHEN',
    description: null,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const result = await buildServiceTest(ProductsService, { audit: true, cache: true, quota: true });
    service = result.service;
    prisma = result.prisma;
    audit = result.audit!;
    cache = result.cache!;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════
  //  list
  // ═════════════════════════════════════════════════════════════════
  describe('list', () => {
    it('returns paginated products with filters', async () => {
      prisma.mockPrisma.product.count.mockResolvedValue(1);
      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);

      const result = await service.list(user, context, { page: 1, pageSize: 20, isActive: undefined, isAvailable: undefined });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]!.name).toBe('Hamburguesa');
      expect(prisma.mockPrisma.tenantFilter).toHaveBeenCalledWith(user, context);
    });

    it('applies search filter across name, sku, description', async () => {
      prisma.mockPrisma.product.count.mockResolvedValue(0);
      prisma.mockPrisma.product.findMany.mockResolvedValue([]);

      await service.list(user, context, { search: 'Hamburguesa', page: 1, pageSize: 20, isActive: undefined, isAvailable: undefined });

      const findManyArgs = prisma.mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyArgs.where.OR).toBeDefined();
      expect(findManyArgs.where.OR).toContainEqual(
        expect.objectContaining({ name: { contains: 'Hamburguesa' } }),
      );
    });

    it('returns cached result when available', async () => {
      const cached = { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
      cache!.get.mockResolvedValue(cached);

      const result = await service.list(user, context, { page: 1, pageSize: 20, isActive: undefined, isAvailable: undefined });

      expect(result).toEqual(cached);
      expect(prisma.mockPrisma.product.count).not.toHaveBeenCalled();
    });

    it('filters by categoryId, isActive, isAvailable, productType', async () => {
      prisma.mockPrisma.product.count.mockResolvedValue(0);
      prisma.mockPrisma.product.findMany.mockResolvedValue([]);

      await service.list(user, context, {
        categoryId: 'cat-1',
        isActive: true,
        isAvailable: true,
        productType: 'SALE',
        page: 1,
        pageSize: 20,
      });

      const findManyArgs = prisma.mockPrisma.product.findMany.mock.calls[0][0];
      expect(findManyArgs.where.categoryId).toBe('cat-1');
      expect(findManyArgs.where.isActive).toBe(true);
      expect(findManyArgs.where.isAvailable).toBe(true);
      expect(findManyArgs.where.productType).toBe('SALE');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  listAll
  // ═════════════════════════════════════════════════════════════════
  describe('listAll', () => {
    it('returns paginated active products for POS', async () => {
      prisma.mockPrisma.product.count.mockResolvedValue(1);
      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);

      const result = await service.listAll(user, context, { isAvailable: true, page: 1, pageSize: 200 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  listLowStock
  // ═════════════════════════════════════════════════════════════════
  describe('listLowStock', () => {
    it('returns products with trackStock and minStock set', async () => {
      prisma.mockPrisma.product.findMany.mockResolvedValue([baseProduct]);

      const result = await service.listLowStock(user, context);

      expect(result).toHaveLength(1);
      expect(prisma.mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trackStock: true,
            minStock: { not: null },
          }),
        }),
      );
    });

    it('returns cached result when available', async () => {
      const cached: any[] = [{ id: 'prod-1', name: 'Cached' }];
      cache!.get.mockResolvedValue(cached);

      const result = await service.listLowStock(user, context);

      expect(result).toEqual(cached);
      expect(prisma.mockPrisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('returns product when found', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(baseProduct);

      const result = await service.getById(user, context, 'prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.name).toBe('Hamburguesa');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    const createDto: CreateProductDto = {
      name: 'Nuevo Producto',
      slug: 'nuevo-producto',
      price: 150,
      categoryId: 'cat-1',
      preparationAreaId: 'area-1',
      trackStock: false,
      productType: 'SALE',
      isActive: true,
      isAvailable: true,
    };

    it('creates a product successfully', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce(null); // no duplicate slug
      prisma.mockPrisma.category.findFirst.mockResolvedValueOnce(baseCategory); // category exists
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValueOnce(baseArea); // area exists
      prisma.mockPrisma.product.create.mockResolvedValue(baseProduct);

      const result = await service.create(user, context, createDto);

      expect(result.id).toBe('prod-1');
      expect(prisma.mockPrisma.product.create).toHaveBeenCalled();
      expect(cache!.delByPattern).toHaveBeenCalledWith('products:*');
    });

    it('throws ConflictException when slug already exists', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.create(user, context, createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when category does not belong to tenant', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce(null); // no duplicate slug
      prisma.mockPrisma.category.findFirst.mockResolvedValueOnce(null); // category not found

      await expect(service.create(user, context, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates a COMBO product with comboItems', async () => {
      const comboDto: CreateProductDto = {
        name: 'Combo Hamburguesa',
        slug: 'combo-hamburguesa',
        price: 120,
        categoryId: 'cat-1',
        preparationAreaId: 'area-1',
        trackStock: false,
        productType: 'COMBO',
        isActive: true,
        isAvailable: true,
        comboItems: [
          { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
          { productId: 'child-2', productName: 'Papas Fritas', quantity: 1 },
        ],
      };

      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce(null); // no duplicate slug
      prisma.mockPrisma.category.findFirst.mockResolvedValueOnce(baseCategory);
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValueOnce(baseArea);
      prisma.mockPrisma.product.create.mockResolvedValue({
        ...baseProduct,
        productType: 'COMBO',
        comboItems: comboDto.comboItems as any,
      });

      const result = await service.create(user, context, comboDto);

      expect(result.productType).toBe('COMBO');
      expect(result.comboItems).toHaveLength(2);
      const items = result.comboItems!;
      expect(items[0]!.productName).toBe('Hamburguesa');
      // Verificar que comboItems se pasó al create
      const createCall = prisma.mockPrisma.product.create.mock.calls[0][0];
      expect(createCall.data.comboItems).toEqual(comboDto.comboItems);
      expect(cache!.delByPattern).toHaveBeenCalledWith('products:*');
    });

    it('creates a SALE product without comboItems', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValueOnce(null);
      prisma.mockPrisma.category.findFirst.mockResolvedValueOnce(baseCategory);
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValueOnce(baseArea);
      prisma.mockPrisma.product.create.mockResolvedValue(baseProduct);

      await service.create(user, context, createDto);

      const createCall = prisma.mockPrisma.product.create.mock.calls[0][0];
      expect(createCall.data.comboItems).toBeUndefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  update
  // ═════════════════════════════════════════════════════════════════
  describe('update', () => {
    const updateDto: UpdateProductDto = { name: 'Hamburguesa Actualizada' };

    it('updates product fields', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(baseProduct);
      prisma.mockPrisma.product.update.mockResolvedValue({
        ...baseProduct,
        name: 'Hamburguesa Actualizada',
      });

      const result = await service.update(user, context, 'prod-1', updateDto);

      expect(result.name).toBe('Hamburguesa Actualizada');
      expect(cache!.delByPattern).toHaveBeenCalledWith('products:*');
    });

    it('throws NotFoundException when product not found', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.update(user, context, 'nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new slug conflicts', async () => {
      prisma.mockPrisma.product.findFirst
        .mockResolvedValueOnce(baseProduct)
        .mockResolvedValueOnce({ id: 'other-prod' });

      await expect(
        service.update(user, context, 'prod-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('logs audit when price changes', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(baseProduct);
      prisma.mockPrisma.product.update.mockResolvedValue({
        ...baseProduct,
        price: decimal(120),
      });

      await service.update(user, context, 'prod-1', { price: 120 });

      expect(audit!.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PRICE_CHANGE',
          entity: 'Product',
        }),
      );
    });

    it('updates comboItems on a COMBO product', async () => {
      const existingCombo = {
        ...baseProduct,
        productType: 'COMBO' as const,
        comboItems: JSON.stringify([
          { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
        ]),
      } as any;

      const updatedCombo = {
        ...existingCombo,
        comboItems: JSON.stringify([
          { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
          { productId: 'child-2', productName: 'Papas Fritas', quantity: 2 },
        ]),
      };

      prisma.mockPrisma.product.findFirst.mockResolvedValue(existingCombo);
      prisma.mockPrisma.product.update.mockResolvedValue(updatedCombo);

      const result = await service.update(user, context, 'prod-1', {
        comboItems: [
          { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
          { productId: 'child-2', productName: 'Papas Fritas', quantity: 2 },
        ],
      });

      const updateCall = prisma.mockPrisma.product.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty('comboItems');
      expect(updateCall.data.comboItems).toHaveLength(2);
      expect(cache!.delByPattern).toHaveBeenCalledWith('products:*');
    });

    it('clears comboItems when updating to SALE type', async () => {
      const existingCombo = {
        ...baseProduct,
        productType: 'COMBO' as const,
        comboItems: JSON.stringify([{ productId: 'child-1', productName: 'Hamburguesa', quantity: 1 }]),
      } as any;

      prisma.mockPrisma.product.findFirst.mockResolvedValue(existingCombo);
      prisma.mockPrisma.product.update.mockResolvedValue(baseProduct);

      await service.update(user, context, 'prod-1', { productType: 'SALE', comboItems: [] });

      const updateCall = prisma.mockPrisma.product.update.mock.calls[0][0];
      expect(updateCall.data.comboItems).toEqual([]);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  softDelete
  // ═════════════════════════════════════════════════════════════════
  describe('softDelete', () => {
    it('soft-deletes a product', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });

      await service.softDelete(user, context, 'prod-1');

      expect(prisma.mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(audit!.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SOFT_DELETE' }),
      );
      expect(cache!.delByPattern).toHaveBeenCalledWith('products:*');
    });

    it('throws NotFoundException when product not found', async () => {
      prisma.mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
