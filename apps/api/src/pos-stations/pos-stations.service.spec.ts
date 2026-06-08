import { Test, TestingModule } from '@nestjs/testing';
import { PosStationsService } from './pos-stations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, createMockJwtService } from '../test/mocks';

describe('PosStationsService', () => {
  let service: PosStationsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let audit: ReturnType<typeof createMockAudit>;
  let jwt: ReturnType<typeof createMockJwtService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();
    jwt = createMockJwtService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosStationsService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: AuditService, useValue: audit },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(PosStationsService);
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
      jwt.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.activate({
        businessSlug: 'test-restaurant',
        stationCode: 'ABC123',
        deviceName: 'POS-Caja-1',
      });

      // Verificar que buscó el business por slug
      expect(prisma.mockPrisma.business.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'test-restaurant' } }),
      );

      // Verificar que buscó la estación por businessId + stationCode
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

      // Verificar que activó la estación (update)
      expect(prisma.mockPrisma.posStation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'station-1' },
          data: expect.objectContaining({ isActive: true }),
        }),
      );

      // Verificar que auditó la activación
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STATION_ACTIVATE',
          entity: 'PosStation',
          entityId: 'station-1',
        }),
      );

      // Verificar que firmó el JWT con el payload correcto
      expect(jwt.signAsync).toHaveBeenCalledWith(
        {
          businessId: 'biz-1',
          branchId: 'branch-1',
          stationId: 'station-1',
          purpose: 'pos_station',
        },
        expect.objectContaining({ expiresIn: '24h' }),
      );

      // Verificar la respuesta completa
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
        service.activate({
          businessSlug: 'nonexistent',
          stationCode: 'ABC123',
        }),
      ).rejects.toThrow(NotFoundException);

      // No debe continuar si no encontró el business
      expect(prisma.mockPrisma.posStation.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when station code is invalid', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(null);

      await expect(
        service.activate({
          businessSlug: 'test-restaurant',
          stationCode: 'INVALID',
        }),
      ).rejects.toThrow(NotFoundException);

      // No debe continuar si no encontró la estación
      expect(prisma.mockPrisma.posStation.update).not.toHaveBeenCalled();
    });

    it('converts stationCode to uppercase', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.posStation.findUnique.mockResolvedValue(mockStation);
      prisma.mockPrisma.posStation.update.mockResolvedValue({ ...mockStation, isActive: true });

      await service.activate({
        businessSlug: 'test-restaurant',
        stationCode: 'abc123', // minúsculas
      });

      // Debe buscar con stationCode en mayúsculas
      const callArg = prisma.mockPrisma.posStation.findUnique.mock.calls[0][0];
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
          data: expect.objectContaining({
            deviceName: 'Caja Principal',
          }),
        }),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  verifyStationToken()
  // ═════════════════════════════════════════════════════════════════

  describe('verifyStationToken', () => {
    it('returns the payload for a valid station JWT', async () => {
      jwt.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.verifyStationToken('valid-token');

      expect(jwt.verifyAsync).toHaveBeenCalledWith(
        'valid-token',
        expect.objectContaining({ secret: process.env.JWT_SECRET }),
      );
      expect(result).toEqual(mockPayload);
    });

    it('throws UnauthorizedException when token is invalid or expired', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.verifyStationToken('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when token purpose is not pos_station', async () => {
      jwt.verifyAsync.mockResolvedValue({
        ...mockPayload,
        purpose: 'access', // purpose incorrecto
      });

      await expect(
        service.verifyStationToken('wrong-purpose-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException for TokenExpiredError', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('TokenExpiredError: jwt expired'));

      await expect(
        service.verifyStationToken('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
