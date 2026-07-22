import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { buildControllerTest, createTestUser } from '../test/controller-test.helper';

const mockUser = createTestUser({ role: 'OWNER' as const });

describe('BusinessController', () => {
  const serviceMock = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('delegates to BusinessService with user.businessId', async () => {
      const mockSettings = { id: 'biz-1', name: 'Mi Restaurante', slug: 'mi-rest' };
      serviceMock.getSettings.mockResolvedValue(mockSettings);

      const controller = await buildControllerTest(BusinessController, [
              { provide: BusinessService, useValue: serviceMock },
            ]);
      const result = await controller.getSettings(mockUser);

      expect(serviceMock.getSettings).toHaveBeenCalledWith('biz-1');
      expect(result).toEqual(mockSettings);
    });

    it('passes through errors from BusinessService', async () => {
      const error = new Error('Business no encontrado');
      serviceMock.getSettings.mockRejectedValue(error);

      const controller = await buildControllerTest(BusinessController, [
              { provide: BusinessService, useValue: serviceMock },
            ]);
      await expect(controller.getSettings(mockUser)).rejects.toThrow(error);
    });
  });

  describe('updateSettings', () => {
    it('delegates to BusinessService with user.businessId and dto', async () => {
      const mockUpdated = { id: 'biz-1', name: 'Nuevo Nombre' };
      serviceMock.updateSettings.mockResolvedValue(mockUpdated);

      const controller = await buildControllerTest(BusinessController, [
              { provide: BusinessService, useValue: serviceMock },
            ]);
      const dto = { name: 'Nuevo Nombre' };
      const result = await controller.updateSettings(mockUser, dto as any);

      expect(serviceMock.updateSettings).toHaveBeenCalledWith('biz-1', dto);
      expect(result).toEqual(mockUpdated);
    });

    it('passes through errors from BusinessService', async () => {
      const error = new Error('Error al actualizar');
      serviceMock.updateSettings.mockRejectedValue(error);

      const controller = await buildControllerTest(BusinessController, [
              { provide: BusinessService, useValue: serviceMock },
            ]);
      await expect(controller.updateSettings(mockUser, {} as any)).rejects.toThrow(error);
    });
  });
});
