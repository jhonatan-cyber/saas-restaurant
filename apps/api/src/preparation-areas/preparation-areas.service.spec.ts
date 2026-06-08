import { Test, TestingModule } from '@nestjs/testing';
import { PreparationAreasService } from './preparation-areas.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createTestUser,
  createTestContext,
} from '../test/mocks';

describe('PreparationAreasService', () => {
  let service: PreparationAreasService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const user = createTestUser();
  const context = createTestContext();

  const baseArea = {
    id: 'area-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    name: 'Cocina',
    code: 'KITCHEN',
    description: 'Cocina principal',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreparationAreasService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
      ],
    }).compile();

    service = module.get(PreparationAreasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════
  //  list
  // ═════════════════════════════════════════════════════════════════
  describe('list', () => {
    it('returns paginated preparation areas', async () => {
      prisma.mockPrisma.preparationArea.count.mockResolvedValue(1);
      prisma.mockPrisma.preparationArea.findMany.mockResolvedValue([baseArea]);

      const result = await service.list(user, context, { page: 1, pageSize: 20, isActive: undefined });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]!.name).toBe('Cocina');
    });

    it('filters by isActive and branchId', async () => {
      prisma.mockPrisma.preparationArea.count.mockResolvedValue(0);
      prisma.mockPrisma.preparationArea.findMany.mockResolvedValue([]);

      await service.list(user, context, { isActive: true, branchId: 'branch-1', page: 1, pageSize: 20 });

      const where = prisma.mockPrisma.preparationArea.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
      expect(where.branchId).toBe('branch-1');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  listAll
  // ═════════════════════════════════════════════════════════════════
  describe('listAll', () => {
    it('returns flat list for dropdowns', async () => {
      prisma.mockPrisma.preparationArea.count.mockResolvedValue(1);
      prisma.mockPrisma.preparationArea.findMany.mockResolvedValue([baseArea]);

      const result = await service.listAll(user, context, { page: 1, pageSize: 200 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.code).toBe('KITCHEN');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('returns area when found', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue(baseArea);

      const result = await service.getById(user, context, 'area-1');

      expect(result.name).toBe('Cocina');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('creates an area successfully', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.preparationArea.create.mockResolvedValue(baseArea);

      const result = await service.create(user, context, {
        name: 'Cocina',
        code: 'KITCHEN',
        branchId: 'branch-1',
        displayOrder: 1,
        isActive: true,
      });

      expect(result.name).toBe('Cocina');
    });

    it('throws ConflictException when code already exists in branch', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(user, context, { name: 'Cocina', code: 'KITCHEN', branchId: 'branch-1', displayOrder: 1, isActive: true }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  update
  // ═════════════════════════════════════════════════════════════════
  describe('update', () => {
    it('updates area fields', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue(baseArea);
      prisma.mockPrisma.preparationArea.update.mockResolvedValue({
        ...baseArea,
        name: 'Cocina y Parrilla',
      });

      const result = await service.update(user, context, 'area-1', {
        name: 'Cocina y Parrilla',
      });

      expect(result.name).toBe('Cocina y Parrilla');
    });

    it('throws NotFoundException when area not found', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue(null);

      await expect(
        service.update(user, context, 'nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if new code conflicts', async () => {
      prisma.mockPrisma.preparationArea.findFirst
        .mockResolvedValueOnce(baseArea)
        .mockResolvedValueOnce({ id: 'other-area' });

      await expect(
        service.update(user, context, 'area-1', { code: 'TAKEN' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  reorder
  // ═════════════════════════════════════════════════════════════════
  describe('reorder', () => {
    it('updates displayOrder in transaction', async () => {
      const items = [
        { id: 'area-1', displayOrder: 2 },
        { id: 'area-2', displayOrder: 1 },
      ];

      await service.reorder(user, context, items);

      expect(prisma.mockPrisma.preparationArea.updateMany).toHaveBeenCalledTimes(2);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  hardDelete
  // ═════════════════════════════════════════════════════════════════
  describe('hardDelete', () => {
    it('hard-deletes an area with no products', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue({
        ...baseArea,
        _count: { products: 0 },
      });

      await service.hardDelete(user, context, 'area-1');

      expect(prisma.mockPrisma.preparationArea.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'area-1' } }),
      );
    });

    it('throws ConflictException if area has products', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue({
        ...baseArea,
        _count: { products: 3 },
      });

      await expect(service.hardDelete(user, context, 'area-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.mockPrisma.preparationArea.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when area not found', async () => {
      prisma.mockPrisma.preparationArea.findFirst.mockResolvedValue(null);

      await expect(service.hardDelete(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
