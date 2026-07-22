import { PosStationsService } from './pos-stations.service';
import { NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { buildServiceTest, MockPrisma, MockAudit, MockJwt } from '../test/service-test.helper';

describe('PosStationsService', () => {
  let service: PosStationsService;
  let prisma: MockPrisma;
  let audit: MockAudit;
  let jwt: MockJwt;

  beforeEach(async () => {
    const result = await buildServiceTest(PosStationsService, { audit: true, jwt: true });
    service = result.service;
    prisma = result.prisma;
    audit = result.audit!;
    jwt = result.jwt!;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Fixtures ─────────────────────────────────────────────────────

  const mockBusiness = {
    id: 'biz-1',
    name: 'Test Restaurant',
  };

  const mockBranch = {
    id: 'branch-1',
    name: 'Sucursal Centro',
  };

  const mockStation = {
    id: 'station-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    stationCode: 'ABC123',
    name: 'Caja 1',
    isActive: false,
    activatedAt: null,
    lastSeenAt: null,
    deviceName: null,
    activatedBy: null,
    branch: mockBranch,
  };

  const mockPayload = {
    businessId: 'biz-1',
    branchId: 'branch-1',
    stationId: 'station-1',
    purpose: 'pos_station' as const,
  };

  // ═════════════════════════════════════════════════════════════════
  //  activate()
  // ═════════════════════════════════════════════════════════════════

  describe('activate', () => {
    it('generates a signed JWT when activation succeeds', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(mockStation);
      prisma.mockPrisma.posStation.update.mockResolvedValue({ ...mockStation, isActive: true });
      jwt!.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.activate({
        businessSlug: 'test-restaurant',
        stationCode: 'ABC123',
        deviceName: 'POS-Caja-1',
      });

      expect(prisma.mockPrisma.business.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'test-restaurant' } }),
      );
      expect(prisma.mockPrisma.posStation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId_stationCode: {
              businessId: 'biz-1',
              stationCode: 'ABC123',
            },
          },
        }),
      );
      expect(prisma.mockPrisma.posStation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'station-1' },
          data: expect.objectContaining({ isActive: true }),
        }),
      );
      expect(audit!.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STATION_ACTIVATE',
          entity: 'PosStation',
          entityId: 'station-1',
        }),
      );
      expect(jwt!.signAsync).toHaveBeenCalledWith(
        {
          businessId: 'biz-1',
          branchId: 'branch-1',
          stationId: 'station-1',
          purpose: 'pos_station',
        },
        expect.objectContaining({ expiresIn: '24h' }),
      );
      expect(result).toEqual({
        stationId: 'station-1',
        branchId: 'branch-1',
        branchName: 'Sucursal Centro',
        businessSig: 'signed-jwt-token',
      });
    });

    it('throws NotFoundException when business slug does not exist', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.activate({ businessSlug: 'nonexistent', stationCode: 'ABC123' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.mockPrisma.posStation.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when station code is invalid', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(null);

      await expect(
        service.activate({ businessSlug: 'test-restaurant', stationCode: 'INVALID' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.mockPrisma.posStation.update).not.toHaveBeenCalled();
    });

    it('converts stationCode to uppercase', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(mockStation);
      prisma.mockPrisma.posStation.update.mockResolvedValue({ ...mockStation, isActive: true });

      await service.activate({ businessSlug: 'test-restaurant', stationCode: 'abc123' });

      const callArg = prisma.mockPrisma.posStation.findUnique.mock.calls[0]![0]!;
      expect(callArg.where.businessId_stationCode.stationCode).toBe('ABC123');
    });

    it('uses deviceName when provided', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(mockStation);
      prisma.mockPrisma.posStation.update.mockResolvedValue({ ...mockStation, isActive: true });

      await service.activate({
        businessSlug: 'test-restaurant',
        stationCode: 'ABC123',
        deviceName: 'Caja Principal',
      });

      expect(prisma.mockPrisma.posStation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deviceName: 'Caja Principal' }),
        }),
      );
    });

    it('reactivates an already-activated station preserving activatedAt', async () => {
      const activatedStation = {
        ...mockStation,
        isActive: false,
        activatedAt: new Date('2024-01-01'),
      };
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(activatedStation);
      prisma.mockPrisma.posStation.update.mockResolvedValue({ ...activatedStation, isActive: true });

      await service.activate({ businessSlug: 'test-restaurant', stationCode: 'ABC123' });

      const updateData = prisma.mockPrisma.posStation.update.mock.calls[0]![0]!.data;
      expect(updateData.activatedAt).toBe(activatedStation.activatedAt);
      expect(updateData.isActive).toBe(true);
    });

    it('logs audit with system as userId when activatedBy is null', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(mockStation);
      prisma.mockPrisma.posStation.update.mockResolvedValue({ ...mockStation, isActive: true });

      await service.activate({ businessSlug: 'test-restaurant', stationCode: 'ABC123' });

      expect(audit!.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'system' }),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  verifyStationToken()
  // ═════════════════════════════════════════════════════════════════

  describe('verifyStationToken', () => {
    it('returns the payload for a valid station JWT', async () => {
      jwt!.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.verifyStationToken('valid-token');

      expect(jwt!.verifyAsync).toHaveBeenCalledWith(
        'valid-token',
        expect.objectContaining({ secret: process.env.JWT_SECRET }),
      );
      expect(result).toEqual(mockPayload);
    });

    it('throws UnauthorizedException when token is invalid or expired', async () => {
      jwt!.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyStationToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when token purpose is not pos_station', async () => {
      jwt!.verifyAsync.mockResolvedValue({ ...mockPayload, purpose: 'access' });

      await expect(service.verifyStationToken('wrong-purpose-token')).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException for TokenExpiredError', async () => {
      jwt!.verifyAsync.mockRejectedValue(new Error('TokenExpiredError: jwt expired'));

      await expect(service.verifyStationToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for JsonWebTokenError (malformed)', async () => {
      jwt!.verifyAsync.mockRejectedValue(new Error('JsonWebTokenError: invalid signature'));

      await expect(service.verifyStationToken('malformed-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  generate()
  // ═════════════════════════════════════════════════════════════════

  describe('generate', () => {
    const createDto = { businessId: 'biz-1', branchId: 'branch-1', name: 'Caja Principal' };
    const createdStation = {
      id: 'station-new',
      businessId: 'biz-1',
      branchId: 'branch-1',
      stationCode: 'XYZ789',
      name: 'Caja Principal',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates a station with unique code and name', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.posStation.create.mockResolvedValue(createdStation);

      const result = await service.generate(createDto);

      expect(prisma.mockPrisma.branch.findFirst).toHaveBeenCalledWith({
        where: { id: 'branch-1', businessId: 'biz-1' },
      });

      expect(prisma.mockPrisma.posStation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId_stationCode: expect.objectContaining({
              businessId: 'biz-1',
            }),
          },
        }),
      );

      expect(prisma.mockPrisma.posStation.create).toHaveBeenCalledWith({
        data: {
          businessId: 'biz-1',
          branchId: 'branch-1',
          stationCode: expect.any(String),
          name: 'Caja Principal',
        },
      });

      const firstCreateCall = prisma.mockPrisma.posStation.create.mock.calls[0]!;
      const createData = firstCreateCall[0]!.data as { stationCode: string };
      expect(createData.stationCode).toMatch(/^[A-Z0-9]{4,6}$/);

      expect(result).toEqual(createdStation);
    });

    it('creates a station without name (null)', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.posStation.create.mockResolvedValue({ ...createdStation, name: null });

      await service.generate({ businessId: 'biz-1', branchId: 'branch-1', name: null });

      const firstCreateCall = prisma.mockPrisma.posStation.create.mock.calls[0]!;
      const createData = firstCreateCall[0]!.data as { name: string | null };
      expect(createData.name).toBeNull();
    });

    it('throws NotFoundException when branch does not belong to business', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.generate(createDto)).rejects.toThrow(NotFoundException);
      expect(prisma.mockPrisma.posStation.create).not.toHaveBeenCalled();
    });

    it('retries station code generation on collision (up to 5 attempts)', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.posStation.findUnique
        .mockResolvedValueOnce({ id: 'existing-1' } as any)
        .mockResolvedValueOnce({ id: 'existing-2' } as any)
        .mockResolvedValueOnce(null);
      prisma.mockPrisma.posStation.create.mockResolvedValue(createdStation);

      await service.generate(createDto);

      expect(prisma.mockPrisma.posStation.findUnique).toHaveBeenCalledTimes(3);
      expect(prisma.mockPrisma.posStation.create).toHaveBeenCalledTimes(1);
    });

    it('gives up after 5 collision attempts and still creates', async () => {
      prisma.mockPrisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.mockPrisma.posStation.findUnique
        .mockResolvedValue({ id: 'existing' } as any);
      prisma.mockPrisma.posStation.create.mockResolvedValue(createdStation);

      await service.generate(createDto);

      expect(prisma.mockPrisma.posStation.findUnique).toHaveBeenCalledTimes(5);
      expect(prisma.mockPrisma.posStation.create).toHaveBeenCalledTimes(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  stationLogin()
  // ═════════════════════════════════════════════════════════════════

  describe('stationLogin', () => {
    const mockUser = {
      id: 'usr-1',
      email: 'cajero@test.com',
      fullName: 'Carlos Cajero',
      role: 'CAJERO',
      businessId: 'biz-1',
      defaultBranchId: null,
      lastLoginAt: new Date('2024-06-01'),
      status: 'ACTIVE' as const,
      business: {
        id: 'biz-1',
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        legalName: 'Test Restaurant SA',
        taxId: 'RFC-123',
        email: 'info@test.com',
        phone: '555-0000',
        logoUrl: null,
        currency: 'MXN',
        timezone: 'America/Mexico_City',
        status: 'ACTIVE',
        plan: 'free' as const,
        trialEndsAt: null,
        planId: null,
        subscription: null,
        moduleReports: false,
        moduleInventory: false,
        modulePosStations: true,
        moduleDeliveryApp: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
      },
      defaultBranch: null,
    };

    const mockBranches = [
      { id: 'branch-1', businessId: 'biz-1', name: 'Centro', code: 'C01', address: null, phone: null, isMain: true, status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date() },
      { id: 'branch-2', businessId: 'biz-1', name: 'Norte', code: 'N01', address: null, phone: null, isMain: false, status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date() },
    ];

    beforeEach(() => {
      jwt!.verifyAsync.mockResolvedValue(mockPayload);
      prisma.mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      prisma.mockPrisma.branch.findMany.mockResolvedValue(mockBranches as any);
      jwt!.signAsync.mockResolvedValue('signed-access-token');
    });

    it('verifies station token and returns access+refresh tokens with user DTO', async () => {
      const result = await service.stationLogin('valid-station-token');

      expect(jwt!.verifyAsync).toHaveBeenCalledWith(
        'valid-station-token',
        expect.objectContaining({ secret: process.env.JWT_SECRET }),
      );

      expect(prisma.mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: 'biz-1',
            status: 'ACTIVE',
            role: { in: ['CAJERO', 'MESERO', 'ADMIN', 'OWNER'] },
          }),
        }),
      );

      expect(prisma.mockPrisma.branch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1', status: 'ACTIVE' },
        }),
      );

      expect(jwt!.signAsync).toHaveBeenCalledTimes(2);

      expect(result).toMatchObject({
        accessToken: 'signed-access-token',
        refreshToken: 'signed-access-token',
        user: expect.objectContaining({
          id: 'usr-1',
          email: 'cajero@test.com',
          role: 'CAJERO',
          businessId: 'biz-1',
          defaultBranchId: 'branch-1',
        }),
      });

      expect(result.user.branches).toHaveLength(2);
      expect(result.user.branches[0]).toMatchObject({ id: 'branch-1', name: 'Centro' });
    });

    it('throws UnauthorizedException when station token is invalid', async () => {
      jwt!.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.stationLogin('invalid-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when no active user found', async () => {
      prisma.mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.stationLogin('valid-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.mockPrisma.branch.findMany).not.toHaveBeenCalled();
    });

    it('builds access token payload with branchIds and 15min expiry', async () => {
      await service.stationLogin('valid-token');

      const signCalls = jwt!.signAsync.mock.calls;
      const accessPayload = signCalls[0]![0]!;

      expect(accessPayload).toMatchObject({
        sub: 'usr-1',
        email: 'cajero@test.com',
        businessId: 'biz-1',
        role: 'CAJERO',
        branchIds: ['branch-1', 'branch-2'],
        typ: 'access',
      });
      expect(signCalls[0]![1]).toMatchObject({ expiresIn: '15m' });
    });

    it('builds refresh token payload with 7d expiry', async () => {
      await service.stationLogin('valid-token');

      const signCalls = jwt!.signAsync.mock.calls;
      const refreshPayload = signCalls[1]![0]!;

      expect(refreshPayload).toMatchObject({
        sub: 'usr-1',
        typ: 'refresh',
      });
      expect(signCalls[1]![1]).toMatchObject({ expiresIn: '7d' });
    });

    it('searches for user ordered by lastLoginAt desc', async () => {
      await service.stationLogin('valid-token');

      expect(prisma.mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastLoginAt: 'desc' },
        }),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  list()
  // ═════════════════════════════════════════════════════════════════

  describe('list', () => {
    const mockStations = [
      { id: 'station-1', stationCode: 'ABC123', branchId: 'branch-1', businessId: 'biz-1', name: 'Caja 1', isActive: true, createdAt: new Date(), updatedAt: new Date(), branch: { id: 'branch-1', name: 'Centro', code: 'C01' } },
      { id: 'station-2', stationCode: 'DEF456', branchId: 'branch-2', businessId: 'biz-1', name: 'Caja 2', isActive: false, createdAt: new Date(), updatedAt: new Date(), branch: { id: 'branch-2', name: 'Norte', code: 'N01' } },
    ];

    it('returns all stations for business without filters', async () => {
      prisma.mockPrisma.posStation.findMany.mockResolvedValue(mockStations);

      const result = await service.list({ businessId: 'biz-1' });

      expect(prisma.mockPrisma.posStation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
          orderBy: { createdAt: 'desc' },
          include: { branch: { select: { id: true, name: true, code: true } } },
        }),
      );
      expect(result).toEqual(mockStations);
    });

    it('filters by branchId', async () => {
      prisma.mockPrisma.posStation.findMany.mockResolvedValue([mockStations[0]]);

      const result = await service.list({ businessId: 'biz-1', branchId: 'branch-1' });

      expect(prisma.mockPrisma.posStation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1', branchId: 'branch-1' },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('filters by isActive=true', async () => {
      prisma.mockPrisma.posStation.findMany.mockResolvedValue([mockStations[0]]);

      const result = await service.list({ businessId: 'biz-1', isActive: true });

      expect(prisma.mockPrisma.posStation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1', isActive: true },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.isActive).toBe(true);
    });

    it('filters by isActive=false', async () => {
      prisma.mockPrisma.posStation.findMany.mockResolvedValue([mockStations[1]]);

      const result = await service.list({ businessId: 'biz-1', isActive: false });

      expect(prisma.mockPrisma.posStation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1', isActive: false },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.isActive).toBe(false);
    });

    it('combines branchId and isActive filters', async () => {
      prisma.mockPrisma.posStation.findMany.mockResolvedValue([]);

      await service.list({ businessId: 'biz-1', branchId: 'branch-1', isActive: true });

      expect(prisma.mockPrisma.posStation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1', branchId: 'branch-1', isActive: true },
        }),
      );
    });

    it('includes branch relation in response', async () => {
      prisma.mockPrisma.posStation.findMany.mockResolvedValue(mockStations);

      await service.list({ businessId: 'biz-1' });

      expect(prisma.mockPrisma.posStation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { branch: { select: { id: true, name: true, code: true } } },
        }),
      );
    });
  });
});
