import { ForbiddenException } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { buildControllerTest, createTestUser, createTestContext } from '../test/controller-test.helper';

const mockUser = createTestUser({ branchIds: [], defaultBranchId: null });
const mockCtx = createTestContext({ branchId: null });

describe('BranchesController', () => {
  const serviceMock = {
    list: jest.fn(), listAll: jest.fn(), getById: jest.fn(),
    create: jest.fn(), update: jest.fn(), deactivate: jest.fn(), reactivate: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      const filters = { page: 1 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('listAll', () => {
    it('delegates with parsed query params', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, 'true', '1', '50');
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { isActive: true, page: 1, pageSize: 50 });
    });

    it('passes through errors from service', async () => {
      serviceMock.listAll.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await expect(ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined)).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'branch-1' });
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'branch-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'branch-1');
      expect(result).toEqual({ id: 'branch-1' });
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'branch-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service', async () => {
      serviceMock.create.mockResolvedValue({ id: 'branch-new' });
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      const dto = { name: 'Sucursal Norte', code: 'N01' } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });

    it('throws ForbiddenException when quota exceeded (maxBranches)', async () => {
      const quotaError = new ForbiddenException('Límite del plan excedido: máximo 1 branches. Actual: 1. Actualiza tu plan para aumentar el límite.');
      serviceMock.create.mockRejectedValue(quotaError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      const dto = { name: 'Sucursal Sur', code: 'S01' } as any;
      await expect(ctrl.create(mockUser, mockCtx, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      serviceMock.update.mockResolvedValue({ id: 'branch-1' });
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      const dto = { name: 'Renamed' } as any;
      await ctrl.update(mockUser, mockCtx, 'branch-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'branch-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await expect(ctrl.update(mockUser, mockCtx, 'branch-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('remove', () => {
    it('delegates deactivate to service', async () => {
      serviceMock.deactivate.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await ctrl.remove(mockUser, mockCtx, 'branch-1');
      expect(serviceMock.deactivate).toHaveBeenCalledWith(mockUser, mockCtx, 'branch-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.deactivate.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await expect(ctrl.remove(mockUser, mockCtx, 'branch-1')).rejects.toThrow(serverError);
    });
  });

  describe('reactivate', () => {
    it('delegates to service', async () => {
      serviceMock.reactivate.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await ctrl.reactivate(mockUser, mockCtx, 'branch-1');
      expect(serviceMock.reactivate).toHaveBeenCalledWith(mockUser, mockCtx, 'branch-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.reactivate.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BranchesController, [
              { provide: BranchesService, useValue: serviceMock },
            ]);
      await expect(ctrl.reactivate(mockUser, mockCtx, 'branch-1')).rejects.toThrow(serverError);
    });
  });
});
