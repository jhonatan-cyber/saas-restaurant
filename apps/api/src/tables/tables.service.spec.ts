import { Test, TestingModule } from '@nestjs/testing';
import { TablesService } from './tables.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockAudit,
  createMockCache,
  createTestUser,
  createTestContext,
} from '../test/mocks';

describe('TablesService', () => {
  let service: TablesService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let audit: ReturnType<typeof createMockAudit>;
  let cache: ReturnType<typeof createMockCache>;

  const user = createTestUser();
  const context = createTestContext();

  const baseTable = {
    id: 'table-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    number: '5',
    capacity: 4,
    location: 'INDOOR' as const,
    displayOrder: 1,
    posX: null,
    posY: null,
    notes: null,
    status: 'FREE' as const,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockBranch = { id: 'branch-1', businessId: 'biz-1', isMain: true };

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();
    cache = createMockCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: AuditService, useValue: audit },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(TablesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════
  //  resolveBranchId
  // ═════════════════════════════════════════════════════════════════
  describe('list', () => {
    it('returns paginated tables filtered by branch', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.restaurantTable.count.mockResolvedValue(1);
      prisma.mockPrisma.restaurantTable.findMany.mockResolvedValue([baseTable]);

      const result = await service.list(user, context, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]!.status).toBe('FREE');
    });

    it('filters by status and location', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.restaurantTable.count.mockResolvedValue(0);
      prisma.mockPrisma.restaurantTable.findMany.mockResolvedValue([]);

      await service.list(user, context, { status: 'OCCUPIED', location: 'OUTDOOR', page: 1, pageSize: 20 });

      const where = prisma.mockPrisma.restaurantTable.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('OCCUPIED');
      expect(where.location).toBe('OUTDOOR');
    });

    it('returns cached result when available', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      const cached = { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
      cache.get.mockResolvedValue(cached);

      const result = await service.list(user, context, { page: 1, pageSize: 20 });

      expect(result).toEqual(cached);
      expect(prisma.mockPrisma.restaurantTable.count).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  listAll
  // ═════════════════════════════════════════════════════════════════
  describe('listAll', () => {
    it('returns flat list for floor plan', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.restaurantTable.count.mockResolvedValue(1);
      prisma.mockPrisma.restaurantTable.findMany.mockResolvedValue([baseTable]);

      const result = await service.listAll(user, context, { page: 1, pageSize: 200 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe('table-1');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('returns table when found', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(baseTable);

      const result = await service.getById(user, context, 'table-1');

      expect(result.id).toBe('table-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('creates a table successfully', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.restaurantTable.create.mockResolvedValue(baseTable);

      const result = await service.create(user, context, {
        branchId: 'branch-1',
        number: '5',
        capacity: 4,
        location: 'INDOOR',
        displayOrder: 1,
      });

      expect(result.number).toBe('5');
      expect(cache.delByPattern).toHaveBeenCalledWith('tables:*');
    });

    it('throws NotFoundException if branch does not exist', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(null);

      await expect(
        service.create(user, context, { branchId: 'invalid', number: '1', capacity: 4, location: 'INDOOR', displayOrder: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if table number already exists in branch', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(user, context, { branchId: 'branch-1', number: '5', capacity: 4, location: 'INDOOR', displayOrder: 0 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  update
  // ═════════════════════════════════════════════════════════════════
  describe('update', () => {
    it('updates table fields', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(baseTable);
      prisma.mockPrisma.restaurantTable.update.mockResolvedValue({
        ...baseTable,
        capacity: 6,
      });

      const result = await service.update(user, context, 'table-1', { capacity: 6 });

      expect(result.capacity).toBe(6);
      expect(cache.delByPattern).toHaveBeenCalledWith('tables:*');
    });

    it('throws NotFoundException when table not found', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(null);

      await expect(
        service.update(user, context, 'nonexistent', { capacity: 6 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if new number conflicts', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(baseTable);
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValueOnce({ id: 'other-table' });

      await expect(
        service.update(user, context, 'table-1', { number: '10' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  changeStatus
  // ═════════════════════════════════════════════════════════════════
  describe('changeStatus', () => {
    it('changes table status and logs the change', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(baseTable);
      prisma.mockPrisma.restaurantTable.update.mockResolvedValue({
        ...baseTable,
        status: 'OCCUPIED',
      });
      prisma.mockPrisma.tableStateLog.create.mockResolvedValue({} as any);

      const result = await service.changeStatus(user, context, 'table-1', {
        status: 'OCCUPIED',
      });

      expect(result.status).toBe('OCCUPIED');
      expect(audit.log).toHaveBeenCalled();
      expect(cache.delByPattern).toHaveBeenCalledWith('tables:*');
    });

    it('returns same table if status is unchanged (no-op)', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(baseTable);

      const result = await service.changeStatus(user, context, 'table-1', {
        status: 'FREE',
      });

      expect(result.status).toBe('FREE');
      expect(prisma.mockPrisma.restaurantTable.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when table not found', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(null);

      await expect(
        service.changeStatus(user, context, 'nonexistent', { status: 'OCCUPIED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  softDelete
  // ═════════════════════════════════════════════════════════════════
  describe('softDelete', () => {
    it('soft-deletes a table', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue({ id: 'table-1' });

      await service.softDelete(user, context, 'table-1');

      expect(prisma.mockPrisma.restaurantTable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'table-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SOFT_DELETE' }),
      );
      expect(cache.delByPattern).toHaveBeenCalledWith('tables:*');
    });

    it('throws NotFoundException when table not found', async () => {
      prisma.mockPrisma.restaurantTable.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
