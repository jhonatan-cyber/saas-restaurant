import { CategoriesService } from './categories.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createTestUser, createTestContext } from '../test/mocks';
import { buildServiceTest, MockPrisma, MockCache } from '../test/service-test.helper';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: MockPrisma;
  let cache: MockCache;

  const user = createTestUser();
  const context = createTestContext();

  const baseCategory = {
    id: 'cat-1',
    businessId: 'biz-1',
    branchId: null,
    name: 'Comidas',
    slug: 'comidas',
    description: 'Platos principales',
    imageUrl: null,
    displayOrder: 1,
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    _count: { products: 5 },
  };

  beforeEach(async () => {
    const result = await buildServiceTest(CategoriesService, { cache: true, quota: true });
    service = result.service;
    prisma = result.prisma;
    cache = result.cache!;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════
  //  list
  // ═════════════════════════════════════════════════════════════════
  describe('list', () => {
    it('returns paginated categories with product counts', async () => {
      prisma.mockPrisma.category.count.mockResolvedValue(1);
      prisma.mockPrisma.category.findMany.mockResolvedValue([baseCategory]);

      const result = await service.list(user, context, { page: 1, pageSize: 20, isActive: undefined });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]!.name).toBe('Comidas');
    });

    it('filters by isActive and branchId', async () => {
      prisma.mockPrisma.category.count.mockResolvedValue(0);
      prisma.mockPrisma.category.findMany.mockResolvedValue([]);

      await service.list(user, context, { isActive: true, branchId: 'branch-1', page: 1, pageSize: 20 });

      const findManyArgs = prisma.mockPrisma.category.findMany.mock.calls[0][0];
      expect(findManyArgs.where.isActive).toBe(true);
      expect(findManyArgs.where.branchId).toBe('branch-1');
    });

    it('applies search filter on name', async () => {
      prisma.mockPrisma.category.count.mockResolvedValue(0);
      prisma.mockPrisma.category.findMany.mockResolvedValue([]);

      await service.list(user, context, { search: 'Comidas', page: 1, pageSize: 20, isActive: undefined });

      const where = prisma.mockPrisma.category.findMany.mock.calls[0][0].where;
      expect(where.name).toEqual({ contains: 'Comidas' });
    });

    it('returns cached result when available', async () => {
      const cached = { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
      cache!.get.mockResolvedValue(cached);

      const result = await service.list(user, context, { page: 1, pageSize: 20, isActive: undefined });

      expect(result).toEqual(cached);
      expect(prisma.mockPrisma.category.count).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  listAll
  // ═════════════════════════════════════════════════════════════════
  describe('listAll', () => {
    it('returns flat list for dropdowns', async () => {
      prisma.mockPrisma.category.count.mockResolvedValue(1);
      prisma.mockPrisma.category.findMany.mockResolvedValue([baseCategory]);

      const result = await service.listAll(user, context, { isActive: true, page: 1, pageSize: 200 });

      expect(result.data).toHaveLength(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('returns category when found', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue(baseCategory);

      const result = await service.getById(user, context, 'cat-1');

      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Comidas');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    const createDto = {
      name: 'Bebidas',
      slug: 'bebidas',
      description: 'Bebidas frías y calientes',
      displayOrder: 2,
      isActive: true,
    };

    it('creates a category successfully', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.category.create.mockResolvedValue(baseCategory);

      const result = await service.create(user, context, createDto);

      expect(result.name).toBe('Comidas');
      expect(cache!.delByPattern).toHaveBeenCalledWith('categories:*');
    });

    it('throws ConflictException when slug already exists in branch', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(user, context, createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.mockPrisma.category.create).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  update
  // ═════════════════════════════════════════════════════════════════
  describe('update', () => {
    it('updates category fields', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue(baseCategory);
      prisma.mockPrisma.category.update.mockResolvedValue({
        ...baseCategory,
        name: 'Bebidas y Tragos',
      });

      const result = await service.update(user, context, 'cat-1', {
        name: 'Bebidas y Tragos',
      });

      expect(result.name).toBe('Bebidas y Tragos');
      expect(cache!.delByPattern).toHaveBeenCalledWith('categories:*');
    });

    it('throws NotFoundException when category not found', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(service.update(user, context, 'nonexistent', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if new slug conflicts', async () => {
      prisma.mockPrisma.category.findFirst
        .mockResolvedValueOnce(baseCategory)
        .mockResolvedValueOnce({ id: 'other-cat' }); // duplicate slug

      await expect(
        service.update(user, context, 'cat-1', { slug: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  reorder
  // ═════════════════════════════════════════════════════════════════
  describe('reorder', () => {
    it('updates displayOrder for multiple categories in transaction', async () => {
      const items = [
        { id: 'cat-1', displayOrder: 2 },
        { id: 'cat-2', displayOrder: 1 },
      ];

      await service.reorder(user, context, items);

      expect(prisma.mockPrisma.category.updateMany).toHaveBeenCalledTimes(2);
      expect(cache!.delByPattern).toHaveBeenCalledWith('categories:*');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  softDelete
  // ═════════════════════════════════════════════════════════════════
  describe('softDelete', () => {
    it('soft-deletes a category with no products', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue({
        ...baseCategory,
        _count: { products: 0 },
      });

      await service.softDelete(user, context, 'cat-1');

      expect(prisma.mockPrisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cat-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(cache!.delByPattern).toHaveBeenCalledWith('categories:*');
    });

    it('throws ConflictException if category has active products', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue({
        ...baseCategory,
        _count: { products: 3 },
      });

      await expect(service.softDelete(user, context, 'cat-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.mockPrisma.category.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when category not found', async () => {
      prisma.mockPrisma.category.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
