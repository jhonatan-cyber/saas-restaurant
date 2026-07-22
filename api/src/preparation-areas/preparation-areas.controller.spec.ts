import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPreparationAreaSchema,
  updatePreparationAreaSchema,
  reorderPreparationAreasSchema,
  preparationAreaFiltersSchema,
} from '@saas/shared';
import { PreparationAreasController } from './preparation-areas.controller';
import { PreparationAreasService } from './preparation-areas.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('PreparationAreasController', () => {
  const serviceMock = {
    list: jest.fn(), listAll: jest.fn(), getById: jest.fn(),
    create: jest.fn(), update: jest.fn(), reorder: jest.fn(), hardDelete: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      const filters = { page: 1 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('listAll', () => {
    it('delegates with parsed params', async () => {
      serviceMock.listAll.mockResolvedValue([]);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, 'true', 'branch-1', '1', '20');
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { isActive: true, branchId: 'branch-1', page: 1, pageSize: 20 });
    });

    it('passes through errors from service', async () => {
      serviceMock.listAll.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await expect(ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined, undefined)).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'area-1' });
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'area-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'area-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'area-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service', async () => {
      serviceMock.create.mockResolvedValue({ id: 'area-new' });
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      const dto = { name: 'Cocina', branchId: 'branch-1' } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      serviceMock.update.mockResolvedValue({ id: 'area-1' });
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      const dto = { name: 'Cocina 2' } as any;
      await ctrl.update(mockUser, mockCtx, 'area-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'area-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await expect(ctrl.update(mockUser, mockCtx, 'area-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('reorder', () => {
    it('delegates to service', async () => {
      serviceMock.reorder.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      const dto = { items: [{ id: 'area-1', sortOrder: 1 }] } as any;
      await ctrl.reorder(mockUser, mockCtx, dto);
      expect(serviceMock.reorder).toHaveBeenCalledWith(mockUser, mockCtx, dto.items);
    });

    it('passes through errors from service', async () => {
      serviceMock.reorder.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await expect(ctrl.reorder(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('remove', () => {
    it('delegates hard delete', async () => {
      serviceMock.hardDelete.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await ctrl.remove(mockUser, mockCtx, 'area-1');
      expect(serviceMock.hardDelete).toHaveBeenCalledWith(mockUser, mockCtx, 'area-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.hardDelete.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PreparationAreasController, [
              { provide: PreparationAreasService, useValue: serviceMock },
            ]);
      await expect(ctrl.remove(mockUser, mockCtx, 'area-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  ZodValidationPipe — payload validation
  // ═════════════════════════════════════════════════════════════════
  describe('validation', () => {
    describe('createPreparationAreaSchema', () => {
      const pipe = new ZodValidationPipe(createPreparationAreaSchema);

      it('rejects empty body (missing name/code)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('rejects body without code', () => {
        expect(() => pipe.transform({ name: 'Cocina' })).toThrow(BadRequestException);
      });

      it('rejects invalid code format', () => {
        expect(() => pipe.transform({ name: 'Cocina', code: 'cocina!' })).toThrow(BadRequestException);
      });

      it('accepts valid payload', () => {
        const result = pipe.transform({ name: 'Cocina', code: 'COCINA' }) as any;
        expect(result.name).toBe('Cocina');
      });
    });

    describe('updatePreparationAreaSchema', () => {
      const pipe = new ZodValidationPipe(updatePreparationAreaSchema);

      it('accepts empty body (partial update)', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('accepts partial payload', () => {
        const result = pipe.transform({ name: 'Nueva Cocina' }) as any;
        expect(result.name).toBe('Nueva Cocina');
      });
    });

    describe('reorderPreparationAreasSchema', () => {
      const pipe = new ZodValidationPipe(reorderPreparationAreasSchema);

      it('rejects empty items array', () => {
        expect(() => pipe.transform({ items: [] })).toThrow(BadRequestException);
      });

      it('rejects missing items', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('accepts valid reorder payload', () => {
        const result = pipe.transform({ items: [{ id: 'c00000001abcd', displayOrder: 0 }] }) as any;
        expect(result.items).toHaveLength(1);
      });
    });

    describe('preparationAreaFiltersSchema', () => {
      const pipe = new ZodValidationPipe(preparationAreaFiltersSchema);

      it('accepts empty filters', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('rejects invalid isActive value', () => {
        expect(() => pipe.transform({ isActive: 'invalid' })).toThrow(BadRequestException);
      });

      it('converts isActive string to boolean', () => {
        expect((pipe.transform({ isActive: 'true' }) as any).isActive).toBe(true);
        expect((pipe.transform({ isActive: 'false' }) as any).isActive).toBe(false);
      });
    });
  });
});
