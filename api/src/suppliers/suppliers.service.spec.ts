import { SuppliersService } from './suppliers.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createTestUser, createTestContext } from '../test/mocks';
import { buildServiceTest, MockPrisma, MockCache } from '../test/service-test.helper';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: MockPrisma;
  let cache: MockCache;

  const user = createTestUser();
  const context = createTestContext();

  const baseSupplier = {
    id: 'supp-1',
    businessId: 'biz-1',
    branchId: null,
    name: 'Distribuidora ABC',
    contactName: 'Juan Pérez',
    email: 'juan@abc.com',
    phone: '555-0100',
    address: 'Calle 123',
    taxId: 'ABC-123',
    notes: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    _count: { purchases: 3 },
  };

  beforeEach(async () => {
    const result = await buildServiceTest(SuppliersService, { cache: true });
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
    it('returns paginated suppliers with purchase counts', async () => {
      cache!.get.mockResolvedValue(null);
      prisma.mockPrisma.supplier.count.mockResolvedValue(1);
      prisma.mockPrisma.supplier.findMany.mockResolvedValue([baseSupplier]);

      const result = await service.list(user, context, { page: 1, pageSize: 20, isActive: undefined });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]!.name).toBe('Distribuidora ABC');
    });

    it('filters by isActive, branchId, and search', async () => {
      cache!.get.mockResolvedValue(null);
      prisma.mockPrisma.supplier.count.mockResolvedValue(0);
      prisma.mockPrisma.supplier.findMany.mockResolvedValue([]);

      await service.list(user, context, {
        isActive: true,
        branchId: 'branch-1',
        search: 'ABC',
        page: 1,
        pageSize: 20,
      });

      const where = prisma.mockPrisma.supplier.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
      expect(where.branchId).toBe('branch-1');
      expect(where.name).toEqual({ contains: 'ABC' });
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  listAll
  // ═════════════════════════════════════════════════════════════════
  describe('listAll', () => {
    it('returns flat list for dropdowns', async () => {
      cache!.get.mockResolvedValue(null);
      prisma.mockPrisma.supplier.count.mockResolvedValue(1);
      prisma.mockPrisma.supplier.findMany.mockResolvedValue([baseSupplier]);

      const result = await service.listAll(user, context, { isActive: true, page: 1, pageSize: 200 });

      expect(result.data).toHaveLength(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('returns supplier when found', async () => {
      prisma.mockPrisma.supplier.findFirst.mockResolvedValue(baseSupplier);

      const result = await service.getById(user, context, 'supp-1');

      expect(result.id).toBe('supp-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.supplier.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    it('creates a supplier successfully', async () => {
      prisma.mockPrisma.supplier.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.supplier.create.mockResolvedValue(baseSupplier);

      const result = await service.create(user, context, {
        name: 'Distribuidora ABC',
        isActive: true,
      });

      expect(result.name).toBe('Distribuidora ABC');
      expect(cache!.delByPattern).toHaveBeenCalledWith('suppliers:*');
    });

    it('throws ConflictException when name already exists in branch', async () => {
      prisma.mockPrisma.supplier.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(user, context, { name: 'Distribuidora ABC', isActive: true }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  update
  // ═════════════════════════════════════════════════════════════════
  describe('update', () => {
    it('updates supplier fields', async () => {
      prisma.mockPrisma.supplier.findFirst
        .mockResolvedValueOnce(baseSupplier) // existing supplier
        .mockResolvedValueOnce(null); // no duplicate name
      prisma.mockPrisma.supplier.update.mockResolvedValue({
        ...baseSupplier,
        name: 'Distribuidora XYZ',
      });

      const result = await service.update(user, context, 'supp-1', {
        name: 'Distribuidora XYZ',
      });

      expect(result.name).toBe('Distribuidora XYZ');
      expect(cache!.delByPattern).toHaveBeenCalledWith('suppliers:*');
    });

    it('throws NotFoundException when supplier not found', async () => {
      prisma.mockPrisma.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.update(user, context, 'nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if new name conflicts', async () => {
      prisma.mockPrisma.supplier.findFirst
        .mockResolvedValueOnce(baseSupplier)
        .mockResolvedValueOnce({ id: 'other-supp' });

      await expect(
        service.update(user, context, 'supp-1', { name: 'Taken Name' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  softDelete
  // ═════════════════════════════════════════════════════════════════
  describe('softDelete', () => {
    it('soft-deletes a supplier', async () => {
      prisma.mockPrisma.supplier.findFirst.mockResolvedValue({ id: 'supp-1' });

      await service.softDelete(user, context, 'supp-1');

      expect(prisma.mockPrisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'supp-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(cache!.delByPattern).toHaveBeenCalledWith('suppliers:*');
    });

    it('throws NotFoundException when supplier not found', async () => {
      prisma.mockPrisma.supplier.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
