import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { createMockConfigService } from '../test/mocks';
import { buildServiceTest, MockPrisma, MockJwt } from '../test/service-test.helper';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwt: MockJwt;
  let config: ReturnType<typeof createMockConfigService>;

  const mockUser = {
    id: 'user-1',
    email: 'admin@test.com',
    fullName: 'Admin',
    role: 'ADMIN' as const,
    businessId: 'biz-1',
    status: 'ACTIVE' as const,
    defaultBranchId: 'branch-1',
    passwordHash: '$2b$12$hashedpassword',
    business: {
      id: 'biz-1', name: 'Test Restaurant', slug: 'test-restaurant',
      legalName: null, taxId: null, email: null, phone: null,
      logoUrl: null, currency: 'ARS', timezone: 'UTC',
      status: 'ACTIVE', plan: 'BASIC', planId: null, trialEndsAt: null,
      moduleReports: false, moduleInventory: false,
      modulePosStations: false, moduleDeliveryApp: false,
      createdAt: new Date(), updatedAt: new Date(),
      subscription: null,
    },
    defaultBranch: { id: 'branch-1', name: 'Centro' },
  };

  beforeEach(async () => {
    config = createMockConfigService({
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    });

    const result = await buildServiceTest(AuthService, {
      jwt: true,
      extra: [{ provide: ConfigService, useValue: config }],
    });
    service = result.service;
    prisma = result.prisma;
    jwt = result.jwt!;
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('returns tokens and user DTO for valid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockUser.business);
      prisma.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.mockPrisma.user.update.mockResolvedValue(mockUser);
      prisma.mockPrisma.userBranch.findMany.mockResolvedValue([]);
      prisma.mockPrisma.branch.findMany.mockResolvedValue([{
        id: 'branch-1', businessId: 'biz-1', name: 'Centro',
        code: 'CTR', address: null, phone: null, isMain: true,
        status: 'ACTIVE',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      }]);
      jwt!.signAsync.mockResolvedValue('mock-token');

      const result = await service.login({
        businessSlug: 'test-restaurant',
        email: 'admin@test.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.user.email).toBe('admin@test.com');
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockUser.business);
      prisma.mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login({
        businessSlug: 'test-restaurant',
        email: 'admin@test.com',
        password: 'wrong-password',
      })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when business is SUSPENDED', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue({
        ...mockUser.business, status: 'SUSPENDED',
      });

      await expect(service.login({
        businessSlug: 'suspended',
        email: 'admin@test.com',
        password: 'any',
      })).rejects.toThrow(UnauthorizedException);
    });

    it('returns null user when business not found', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(service.login({
        businessSlug: 'nonexistent',
        email: 'admin@test.com',
        password: 'any',
      })).rejects.toThrow(UnauthorizedException);
    });

    it('returns null when user status is not ACTIVE', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockUser.business);
      prisma.mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser, status: 'INACTIVE',
      });

      await expect(service.login({
        businessSlug: 'test-restaurant',
        email: 'admin@test.com',
        password: 'any',
      })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('returns new access token and expiresIn', async () => {
      jwt!.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refresh({
        sub: 'user-1', email: 'admin@test.com',
        businessId: 'biz-1', role: 'ADMIN', branchIds: ['branch-1'],
      });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.expiresIn).toBeGreaterThan(0);
    });
  });

  describe('checkBusiness', () => {
    it('returns exists:true when business slug is found', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue({ id: 'biz-1' });

      const result = await service.checkBusiness('demo');

      expect(result).toEqual({ exists: true });
      expect(prisma.mockPrisma.business.findUnique).toHaveBeenCalledWith({
        where: { slug: 'demo' },
        select: { id: true },
      });
    });

    it('returns exists:false when business slug is not found', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(null);

      const result = await service.checkBusiness('nonexistent');

      expect(result).toEqual({ exists: false });
    });
  });

  describe('buildAuthenticatedUserDto', () => {
    it('builds full user DTO with business and branches', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.mockPrisma.userBranch.findMany.mockResolvedValue([]);
      prisma.mockPrisma.branch.findMany.mockResolvedValue([{
        id: 'branch-1', businessId: 'biz-1', name: 'Centro',
        code: 'CTR', address: null, phone: null, isMain: true,
        status: 'ACTIVE',
        categoriesCount: 0, productsCount: 0, tablesCount: 0,
        activeOrdersCount: 0, openCashRegistersCount: 0,
        openShiftsCount: 0, activePosStationsCount: 0,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      }]);

      const result = await service.buildAuthenticatedUserDto('user-1');

      expect(result.id).toBe('user-1');
      expect(result.branches).toHaveLength(1);
      expect(result.business.name).toBe('Test Restaurant');
    });

    it('throws UnauthorizedException when user not found', async () => {
      prisma.mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.buildAuthenticatedUserDto('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
