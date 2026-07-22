import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createTableSchema, updateTableSchema, changeTableStatusSchema, tableFiltersSchema } from '@saas/shared';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('TablesController', () => {
  const serviceMock = {
    list: jest.fn(), listAll: jest.fn(), getById: jest.fn(),
    create: jest.fn(), update: jest.fn(), changeStatus: jest.fn(), softDelete: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      const filters = { page: 1 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('listAll', () => {
    it('delegates with parsed query params', async () => {
      serviceMock.listAll.mockResolvedValue([]);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, 'branch-1', '1', '50');
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { branchId: 'branch-1', page: 1, pageSize: 50 });
    });

    it('passes through errors from service', async () => {
      serviceMock.listAll.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await expect(ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined)).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'table-1', number: 5 });
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'table-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'table-1');
      expect(result).toEqual({ id: 'table-1', number: 5 });
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'table-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service', async () => {
      serviceMock.create.mockResolvedValue({ id: 'table-new' });
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      const dto = { number: 5, branchId: 'branch-1' } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      serviceMock.update.mockResolvedValue({ id: 'table-1' });
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      const dto = { number: 10 } as any;
      await ctrl.update(mockUser, mockCtx, 'table-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'table-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await expect(ctrl.update(mockUser, mockCtx, 'table-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('changeStatus', () => {
    it('delegates to service', async () => {
      serviceMock.changeStatus.mockResolvedValue({ id: 'table-1', status: 'OCCUPIED' });
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      const dto = { status: 'OCCUPIED' } as any;
      const result = await ctrl.changeStatus(mockUser, mockCtx, 'table-1', dto);
      expect(serviceMock.changeStatus).toHaveBeenCalledWith(mockUser, mockCtx, 'table-1', dto);
      expect(result).toEqual({ id: 'table-1', status: 'OCCUPIED' });
    });

    it('passes through errors from service', async () => {
      serviceMock.changeStatus.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await expect(ctrl.changeStatus(mockUser, mockCtx, 'table-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('remove', () => {
    it('delegates soft delete', async () => {
      serviceMock.softDelete.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await ctrl.remove(mockUser, mockCtx, 'table-1');
      expect(serviceMock.softDelete).toHaveBeenCalledWith(mockUser, mockCtx, 'table-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.softDelete.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(TablesController, [
              { provide: TablesService, useValue: serviceMock },
            ]);
      await expect(ctrl.remove(mockUser, mockCtx, 'table-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  ZodValidationPipe — payload validation
  // ═════════════════════════════════════════════════════════════════
  describe('validation', () => {
    describe('createTableSchema', () => {
      const pipe = new ZodValidationPipe(createTableSchema);

      it('rejects empty body (missing branchId/number)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('rejects body with only branchId (missing number)', () => {
        expect(() => pipe.transform({ branchId: 'branch-1' })).toThrow(BadRequestException);
      });

      it('accepts valid payload', () => {
        const result = pipe.transform({ branchId: 'c000000001abcd', number: '5' }) as any;
        expect(result).toBeDefined();
        expect(result.number).toBe('5');
      });
    });

    describe('updateTableSchema', () => {
      const pipe = new ZodValidationPipe(updateTableSchema);

      it('accepts empty body (partial update)', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('allows update without branchId (omitted from schema via .omit())', () => {
        const result = pipe.transform({ number: '10' }) as any;
        expect(result.number).toBe('10');
      });
    });

    describe('changeTableStatusSchema', () => {
      const pipe = new ZodValidationPipe(changeTableStatusSchema);

      it('rejects empty body (missing status)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('rejects invalid status value', () => {
        expect(() => pipe.transform({ status: 'INVALID' })).toThrow(BadRequestException);
      });

      it('accepts valid OCCUPIED status', () => {
        const result = pipe.transform({ status: 'OCCUPIED' }) as any;
        expect(result.status).toBe('OCCUPIED');
      });

      it('accepts valid FREE status with reason', () => {
        const result = pipe.transform({ status: 'FREE', reason: 'Cliente se fue' }) as any;
        expect(result.status).toBe('FREE');
        expect(result.reason).toBe('Cliente se fue');
      });
    });

    describe('tableFiltersSchema', () => {
      const pipe = new ZodValidationPipe(tableFiltersSchema);

      it('accepts empty filters', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('rejects invalid page (below min)', () => {
        expect(() => pipe.transform({ page: 0 })).toThrow(BadRequestException);
      });

      it('accepts valid filters', () => {
        const result = pipe.transform({ branchId: 'c000000001abcd', status: 'FREE' }) as any;
        expect(result.branchId).toBe('c000000001abcd');
      });
    });
  });
});
