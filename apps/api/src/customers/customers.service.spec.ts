import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockCache,
  createTestUser,
  createTestContext,
  decimal,
} from '../test/mocks';
import type { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let cache: ReturnType<typeof createMockCache>;

  const user = createTestUser();
  const context = createTestContext();

  const baseCustomer = {
    id: 'cust-1',
    businessId: 'biz-1',
    name: 'Carlos García',
    taxId: '12345678',
    taxIdType: 'DNI' as const,
    email: 'carlos@example.com',
    phone: '555-1000',
    address: 'Av. Siempre Viva 742',
    addressReference: 'Casa blanca',
    latitude: decimal(-34.6037),
    longitude: decimal(-58.3816),
    notes: null,
    isActive: true,
    deletedAt: null,
    totalSpent: decimal(5000),
    totalOrders: 15,
    lastOrderAt: new Date('2025-03-15'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    cache = createMockCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════
  //  list
  // ═════════════════════════════════════════════════════════════════
  describe('list', () => {
    it('returns paginated customers', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.customer.count.mockResolvedValue(1);
      prisma.mockPrisma.customer.findMany.mockResolvedValue([baseCustomer]);

      const result = await service.list(user, context, { page: 1, pageSize: 20, isActive: undefined });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]!.name).toBe('Carlos García');
    });

    it('filters by isActive and search (name, taxId, email, phone)', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.customer.count.mockResolvedValue(0);
      prisma.mockPrisma.customer.findMany.mockResolvedValue([]);

      await service.list(user, context, { isActive: true, search: 'Carlos', page: 1, pageSize: 20 });

      const where = prisma.mockPrisma.customer.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
      expect(where.OR).toBeDefined();
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { name: { contains: 'Carlos' } },
        ]),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  search (autocomplete)
  // ═════════════════════════════════════════════════════════════════
  describe('search', () => {
    it('returns recent customers when query is empty', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.customer.findMany.mockResolvedValue([baseCustomer]);

      const result = await service.search(user, context, '', 20);

      expect(result).toHaveLength(1);
      expect(prisma.mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('searches customers by name, taxId, email, phone', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.customer.findMany.mockResolvedValue([]);

      await service.search(user, context, 'Carlos');

      const where = prisma.mockPrisma.customer.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(4);
      expect(where.OR).toContainEqual({ name: { contains: 'Carlos' } });
    });

    it('limits results to 50 max', async () => {
      cache.get.mockResolvedValue(null);
      prisma.mockPrisma.customer.findMany.mockResolvedValue([]);

      await service.search(user, context, 'test', 100);

      expect(prisma.mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  getById
  // ═════════════════════════════════════════════════════════════════
  describe('getById', () => {
    it('returns customer when found', async () => {
      prisma.mockPrisma.customer.findFirst.mockResolvedValue(baseCustomer);

      const result = await service.getById(user, context, 'cust-1');

      expect(result.name).toBe('Carlos García');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  create
  // ═════════════════════════════════════════════════════════════════
  describe('create', () => {
    const createDto: CreateCustomerDto = {
      name: 'María López',
      taxId: '87654321',
      taxIdType: 'DNI',
      email: 'maria@example.com',
      phone: '555-2000',
      isActive: true,
    };

    it('creates a customer successfully', async () => {
      prisma.mockPrisma.customer.create.mockResolvedValue(baseCustomer);

      const result = await service.create(user, context, createDto);

      expect(result.name).toBe('Carlos García');
      expect(prisma.mockPrisma.customer.create).toHaveBeenCalled();
      expect(cache.delByPattern).toHaveBeenCalledWith('customers:*');
    });

    it('creates a customer with location data', async () => {
      prisma.mockPrisma.customer.create.mockResolvedValue(baseCustomer);

      await service.create(user, context, {
        ...createDto,
        latitude: -34.6037,
        longitude: -58.3816,
      });

      const createData = prisma.mockPrisma.customer.create.mock.calls[0][0].data;
      expect(createData.latitude).toBeDefined();
      expect(createData.longitude).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  update
  // ═════════════════════════════════════════════════════════════════
  describe('update', () => {
    const updateDto: UpdateCustomerDto = {
      name: 'Carlos García Actualizado',
      phone: '555-9999',
    };

    it('updates customer fields', async () => {
      prisma.mockPrisma.customer.findFirst.mockResolvedValue(baseCustomer);
      prisma.mockPrisma.customer.update.mockResolvedValue({
        ...baseCustomer,
        name: 'Carlos García Actualizado',
      });

      const result = await service.update(user, context, 'cust-1', updateDto);

      expect(result.name).toBe('Carlos García Actualizado');
      expect(cache.delByPattern).toHaveBeenCalledWith('customers:*');
    });

    it('throws NotFoundException when customer not found', async () => {
      prisma.mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.update(user, context, 'nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  softDelete
  // ═════════════════════════════════════════════════════════════════
  describe('softDelete', () => {
    it('soft-deletes a customer', async () => {
      prisma.mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1' });

      await service.softDelete(user, context, 'cust-1');

      expect(prisma.mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            isActive: false,
          }),
        }),
      );
      expect(cache.delByPattern).toHaveBeenCalledWith('customers:*');
    });

    it('throws NotFoundException when customer not found', async () => {
      prisma.mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(user, context, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
