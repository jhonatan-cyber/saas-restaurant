import { Test, TestingModule } from '@nestjs/testing';
import { BranchesService } from './branches.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockCache,
  createTestUser,
  createTestContext,
} from '../test/mocks';

describe('BranchesService', () => {
  let service: BranchesService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let cache: ReturnType<typeof createMockCache>;

  const user = createTestUser();
  const context = createTestContext();

  const baseBranch = {
    id: 'branch-1',
    businessId: 'biz-1',
    name: 'Sucursal Centro',
    code: 'CENTRO',
    address: 'Av. Principal 123',
    phone: '555-0100',
    isMain: true,
    status: 'ACTIVE' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    _count: {
      categories: 5,
      products: 20,
      tables: 10,
      orders: 2,
      cashRegisters: 1,
      shifts: 1,
      posStations: 3,
    },
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    cache = createMockCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(BranchesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════
  //  list
  // ═════════════════════════════════════════════════════════════════
  describe('list', () => {
    it('returns paginated branches with counts', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.branch.count.mockResolvedValue(1);
      prisma.mockPrisma.branch.findMany.mockResolvedValue([baseBranch]);

      const result = await service.list(user, context, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Sucursal Centro');
    });

    it('filters by isActive and search', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.branch.count.mockResolvedValue(0);
      prisma.mockPrisma.branch.findMany.mockResolvedValue([]);

      await service.list(user, context, { search: 'Centro' });

      const where = prisma.mockPrisma.branch.findMany.mock.calls[0][0].where;
      expect(where.name).toEqual({ contains: 'Centro' });
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  listAll
  // ═════════════════════════════════════════════════════════════════
  describe('listAll', () => {
    it('returns flat list for dropdowns', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.branch.count.mockResolvedValue(1);
      prisma.mockPrisma.branch.findMany.mockResolvedValue([baseBranch]);

      const result = await service.listAll(user, context, { isActive: true });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Sucursal Centro');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('returns branch when found', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(baseBranch);

      const result = await service.getById(user, context, 'branch-1');

      expect(result.name).toBe('Sucursal Centro');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('creates a branch as main when it is the first one', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.branch.count.mockResolvedValue(0);
      prisma.mockPrisma.branch.create.mockResolvedValue(baseBranch);

      const result = await service.create(user, context, {
        name: 'Sucursal Centro',
        code: 'CENTRO',
        isMain: true,
      });

      expect(result.name).toBe('Sucursal Centro');
      expect(prisma.mockPrisma.branch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isMain: true }),
        }),
      );
      expect(cache.delByPattern).toHaveBeenCalledWith('branches:*');
    });

    it('throws ConflictException when code already exists', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(user, context, { name: 'Otra', code: 'CENTRO', isMain: false }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  update
  // ═════════════════════════════════════════════════════════════════
  describe('update', () => {
    it('updates branch fields', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(baseBranch);
      prisma.mockPrisma.branch.findFirst.mockResolvedValueOnce(baseBranch);
      prisma.mockPrisma.branch.update.mockResolvedValue({
        ...baseBranch,
        name: 'Centro Actualizado',
      });

      const result = await service.update(user, context, 'branch-1', {
        name: 'Centro Actualizado',
      });

      expect(result.name).toBe('Centro Actualizado');
      expect(cache.delByPattern).toHaveBeenCalledWith('branches:*');
    });

    it('throws NotFoundException when branch not found', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(null);

      await expect(
        service.update(user, context, 'nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if new code conflicts', async () => {
      prisma.mockPrisma.branch.findFirst
        .mockResolvedValueOnce(baseBranch)
        .mockResolvedValueOnce({ id: 'other-branch' });

      await expect(
        service.update(user, context, 'branch-1', { code: 'TAKEN' }),
      ).rejects.toThrow(ConflictException);
    });

    it('blocks deactivation when branch has active dependencies', async () => {
      prisma.mockPrisma.branch.findFirst
        .mockResolvedValueOnce(baseBranch) // existing
        .mockResolvedValueOnce(baseBranch); // ensureNoActiveDependencies

      await expect(
        service.update(user, context, 'branch-1', { status: 'INACTIVE' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  deactivate
  // ═════════════════════════════════════════════════════════════════
  describe('deactivate', () => {
    it('deactivates a branch with no dependencies', async () => {
      const emptyBranch = {
        ...baseBranch,
        _count: {
          categories: 0,
          products: 0,
          tables: 0,
          orders: 0,
          cashRegisters: 0,
          shifts: 0,
          posStations: 0,
        },
      };
      prisma.mockPrisma.branch.findFirst
        .mockResolvedValueOnce(baseBranch) // deactivate check
        .mockResolvedValueOnce(emptyBranch); // ensureNoActiveDependencies

      await service.deactivate(user, context, 'branch-1');

      expect(prisma.mockPrisma.branch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'branch-1' },
          data: { status: 'INACTIVE' },
        }),
      );
      expect(cache.delByPattern).toHaveBeenCalledWith('branches:*');
    });

    it('is a no-op if branch is already INACTIVE', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue({
        ...baseBranch,
        status: 'INACTIVE',
      });

      await service.deactivate(user, context, 'branch-1');

      expect(prisma.mockPrisma.branch.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when branch not found', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.deactivate(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  reactivate
  // ═════════════════════════════════════════════════════════════════
  describe('reactivate', () => {
    it('reactivates a branch', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue({
        ...baseBranch,
        status: 'INACTIVE',
      });

      await service.reactivate(user, context, 'branch-1');

      expect(prisma.mockPrisma.branch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'branch-1' },
          data: { status: 'ACTIVE' },
        }),
      );
      expect(cache.delByPattern).toHaveBeenCalledWith('branches:*');
    });

    it('throws NotFoundException when branch not found', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.reactivate(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
