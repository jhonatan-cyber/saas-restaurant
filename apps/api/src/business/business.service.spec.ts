import { Test, TestingModule } from '@nestjs/testing';
import { BusinessService } from './business.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { createMockPrisma } from '../test/mocks';

describe('BusinessService', () => {
  let service: BusinessService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const bizId = 'biz-1';

  const baseBusiness = {
    id: bizId,
    name: 'Mi Restaurante',
    slug: 'mi-restaurante',
    legalName: 'Mi Restaurante SRL',
    taxId: '30-12345678-9',
    email: 'info@mi-restaurante.com',
    phone: '555-0000',
    logoUrl: null,
    currency: 'ARS',
    timezone: 'America/Argentina/Buenos_Aires',
    status: 'ACTIVE' as const,
    plan: 'BASIC',
    planId: null,
    trialEndsAt: null,
    moduleReports: false,
    moduleInventory: false,
    modulePosStations: false,
    moduleDeliveryApp: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    planRef: null,
    subscription: null,
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
      ],
    }).compile();
    service = module.get(BusinessService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getSettings', () => {
    it('returns business with plan and subscription', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(baseBusiness);

      const result = await service.getSettings(bizId);

      expect(result.id).toBe(bizId);
      expect(result.name).toBe('Mi Restaurante');
    });

    it('throws NotFoundException when business not found', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(service.getSettings('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('updates business fields', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(baseBusiness);
      prisma.mockPrisma.business.update.mockResolvedValue({
        ...baseBusiness,
        name: 'Nuevo Nombre',
      });

      const result = await service.updateSettings(bizId, { name: 'Nuevo Nombre' });

      expect(result.name).toBe('Nuevo Nombre');
      expect(prisma.mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: bizId },
          data: expect.objectContaining({ name: 'Nuevo Nombre' }),
        }),
      );
    });

    it('updates optional fields like timezone and modules', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(baseBusiness);
      prisma.mockPrisma.business.update.mockResolvedValue({
        ...baseBusiness,
        timezone: 'UTC',
        moduleReports: true,
      } as any);

      await service.updateSettings(bizId, {
        timezone: 'UTC',
        moduleReports: true,
        moduleInventory: true,
      });

      const data = prisma.mockPrisma.business.update.mock.calls[0][0].data;
      expect(data.timezone).toBe('UTC');
      expect(data.moduleReports).toBe(true);
      expect(data.moduleInventory).toBe(true);
    });

    it('throws NotFoundException when business not found', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSettings('nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
