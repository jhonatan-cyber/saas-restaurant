import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createTestUser,
} from '../test/mocks';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const user = createTestUser();
  const bizId = 'biz-1';

  const baseUser = {
    id: 'user-2',
    businessId: bizId,
    email: 'empleado@test.com',
    fullName: 'Empleado',
    phone: null,
    role: 'CAJERO',
    status: 'ACTIVE',
    avatarUrl: null,
    defaultBranchId: null,
    passwordHash: 'hashed',
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    business: { id: bizId, name: 'Test' },
    defaultBranch: null,
  };

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('returns user with business and defaultBranch', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.findById('user-2');

      expect(result!.id).toBe('user-2');
    });

    it('returns null when not found', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailInBusiness', () => {
    it('finds user by composite key (businessId, email)', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.findByEmailInBusiness(bizId, 'EMPLEADO@TEST.COM');

      expect(result!.id).toBe('user-2');
      expect(prisma.mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId_email: {
              businessId: bizId,
              email: 'empleado@test.com', // lowered/trimmed
            },
          },
        }),
      );
    });
  });

  describe('listByBusiness', () => {
    it('lists users in a business', async () => {
      prisma.mockPrisma.user.findMany.mockResolvedValue([baseUser]);

      const result = await service.listByBusiness(bizId);

      expect(result).toHaveLength(1);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true when user has one of the allowed roles', () => {
      expect(service.hasAnyRole('ADMIN', ['ADMIN', 'OWNER'])).toBe(true);
    });

    it('returns false when user does not have an allowed role', () => {
      expect(service.hasAnyRole('CAJERO', ['ADMIN', 'OWNER'])).toBe(false);
    });
  });

  describe('create', () => {
    it('creates a user with hashed password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.mockPrisma.user.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.user.create.mockResolvedValue(baseUser);

      const result = await service.create(user, bizId, {
        email: 'EMPLEADO@TEST.COM',
        fullName: 'Empleado',
        password: 'secure123',
        role: 'CASHIER' as any,
      });

      expect(result).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('secure123', 12);
    });

    it('throws BadRequestException when email already exists in business', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.create(user, bizId, {
          email: 'empleado@test.com',
          fullName: 'Empleado',
          password: 'secure123',
          role: 'CASHIER' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns paginated users with filters', async () => {
      prisma.mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      prisma.mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.list(bizId, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by search, role, and status', async () => {
      prisma.mockPrisma.user.findMany.mockResolvedValue([]);
      prisma.mockPrisma.user.count.mockResolvedValue(0);

      await service.list(bizId, { search: 'Empleado', role: 'CAJERO', status: 'ACTIVE' });

      const where = prisma.mockPrisma.user.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.role).toBe('CAJERO');
      expect(where.status).toBe('ACTIVE');
    });
  });

  describe('getById', () => {
    it('returns user by id', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.getById('user-2');

      expect(result.id).toBe('user-2');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates user fields', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.mockPrisma.user.update.mockResolvedValue({
        ...baseUser,
        fullName: 'Empleado Actualizado',
      });

      const result = await service.update(user, 'user-2', { fullName: 'Empleado Actualizado' });

      expect(result).toBeDefined();
    });

    it('throws NotFoundException when user not in same business', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser, businessId: 'other-biz',
      });

      await expect(
        service.update(user, 'user-2', { fullName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when new email conflicts', async () => {
      prisma.mockPrisma.user.findUnique
        .mockResolvedValueOnce(baseUser)
        .mockResolvedValueOnce({ id: 'other-user' });

      await expect(
        service.update(user, 'user-2', { email: 'existing@test.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('inactivate', () => {
    it('sets user status to INACTIVE', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.mockPrisma.user.update.mockResolvedValue({
        id: 'user-2', status: 'INACTIVE',
      });

      const result = await service.inactivate('user-2');

      expect(result.status).toBe('INACTIVE');
    });

    it('throws NotFoundException when user not found', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.inactivate('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
