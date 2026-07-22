import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { buildControllerTest, createTestUser, createTestContext } from '../test/controller-test.helper';

const mockUser = createTestUser({ role: 'OWNER' as const });
const mockCtx = createTestContext();

describe('UsersController', () => {
  const serviceMock = {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    inactivate: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  describe('create', () => {
    it('delegates to service with user and dto', async () => {
      serviceMock.create.mockResolvedValue({ id: 'user-new' });
      const ctrl = await buildControllerTest(UsersController, [
              { provide: UsersService, useValue: serviceMock },
            ]);
      const dto = { email: 'nuevo@test.com', password: '123456', role: 'MESERO' } as any;
      await ctrl.create(mockUser, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, 'biz-1', dto);
    });

    it('throws ForbiddenException when quota exceeded (maxUsers)', async () => {
      const quotaError = new ForbiddenException('Límite del plan excedido: máximo 5 users. Actual: 5. Actualiza tu plan para aumentar el límite.');
      serviceMock.create.mockRejectedValue(quotaError);
      const ctrl = await buildControllerTest(UsersController, [
              { provide: UsersService, useValue: serviceMock },
            ]);
      const dto = { email: 'nuevo@test.com', password: '123456', role: 'MESERO' } as any;
      await expect(ctrl.create(mockUser, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('list', () => {
    it('delegates to service with businessId and filters', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(UsersController, [
              { provide: UsersService, useValue: serviceMock },
            ]);
      const filters = { page: 1, role: 'MESERO' } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith('biz-1', filters);
    });
  });

  describe('getById', () => {
    it('delegates to service with id', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
      const ctrl = await buildControllerTest(UsersController, [
              { provide: UsersService, useValue: serviceMock },
            ]);
      const result = await ctrl.getById('user-1');
      expect(serviceMock.getById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ id: 'user-1', email: 'test@test.com' });
    });
  });

  describe('update', () => {
    it('delegates to service with user, id, and dto', async () => {
      serviceMock.update.mockResolvedValue({ id: 'user-1' });
      const ctrl = await buildControllerTest(UsersController, [
              { provide: UsersService, useValue: serviceMock },
            ]);
      const dto = { fullName: 'Updated Name' } as any;
      await ctrl.update(mockUser, 'user-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, 'user-1', dto);
    });
  });

  describe('remove', () => {
    it('delegates inactivate to service', async () => {
      serviceMock.inactivate.mockResolvedValue({ id: 'user-1', status: 'INACTIVE' });
      const ctrl = await buildControllerTest(UsersController, [
              { provide: UsersService, useValue: serviceMock },
            ]);
      const result = await ctrl.remove('user-1');
      expect(serviceMock.inactivate).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ id: 'user-1', status: 'INACTIVE' });
    });
  });
});
