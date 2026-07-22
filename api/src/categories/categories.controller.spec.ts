import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  categoryFiltersSchema,
} from '@saas/shared';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('CategoriesController', () => {
  const serviceMock = {
    list: jest.fn(), listAll: jest.fn(), getById: jest.fn(),
    create: jest.fn(), update: jest.fn(), reorder: jest.fn(), softDelete: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service with filters', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      const filters = { page: 1, pageSize: 20 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('listAll', () => {
    it('delegates to service with query params', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, 'true', 'branch-1', '1', '20');
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { isActive: true, branchId: 'branch-1', page: 1, pageSize: 20 });
    });

    it('passes undefined when query params omitted', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined, undefined);
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, {});
    });

    it('passes through errors from service', async () => {
      serviceMock.listAll.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await expect(ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined, undefined)).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service with id', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'cat-1', name: 'Bebidas' });
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'cat-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'cat-1');
      expect(result).toEqual({ id: 'cat-1', name: 'Bebidas' });
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'cat-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service with dto', async () => {
      serviceMock.create.mockResolvedValue({ id: 'cat-1' });
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      const dto = { name: 'Nueva Cat', branchId: 'branch-1' } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });

    it('throws ForbiddenException when quota exceeded (maxCategories)', async () => {
      const quotaError = new ForbiddenException('Límite del plan excedido: máximo 10 categories. Actual: 10. Actualiza tu plan para aumentar el límite.');
      serviceMock.create.mockRejectedValue(quotaError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      const dto = { name: 'Otra Cat', branchId: 'branch-1' } as any;
      await expect(ctrl.create(mockUser, mockCtx, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('delegates to service with id and dto', async () => {
      serviceMock.update.mockResolvedValue({ id: 'cat-1' });
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      const dto = { name: 'Updated' } as any;
      await ctrl.update(mockUser, mockCtx, 'cat-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'cat-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await expect(ctrl.update(mockUser, mockCtx, 'cat-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('reorder', () => {
    it('delegates to service with items', async () => {
      serviceMock.reorder.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      const dto = { items: [{ id: 'cat-1', sortOrder: 1 }] } as any;
      await ctrl.reorder(mockUser, mockCtx, dto);
      expect(serviceMock.reorder).toHaveBeenCalledWith(mockUser, mockCtx, dto.items);
    });

    it('passes through errors from service', async () => {
      serviceMock.reorder.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await expect(ctrl.reorder(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('remove', () => {
    it('delegates to service for soft delete', async () => {
      serviceMock.softDelete.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await ctrl.remove(mockUser, mockCtx, 'cat-1');
      expect(serviceMock.softDelete).toHaveBeenCalledWith(mockUser, mockCtx, 'cat-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.softDelete.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CategoriesController, [
              { provide: CategoriesService, useValue: serviceMock },
            ]);
      await expect(ctrl.remove(mockUser, mockCtx, 'cat-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  ZodValidationPipe — payload validation
  // ═════════════════════════════════════════════════════════════════
  describe('validation', () => {
    describe('createCategorySchema', () => {
      const pipe = new ZodValidationPipe(createCategorySchema);

      it('rejects empty body (missing name/slug)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('rejects body with only name (missing slug)', () => {
        expect(() => pipe.transform({ name: 'Bebidas' })).toThrow(BadRequestException);
      });

      it('rejects invalid slug format', () => {
        expect(() => pipe.transform({ name: 'Bebidas', slug: 'invalid slug!' })).toThrow(BadRequestException);
      });

      it('accepts valid payload', () => {
        const result = pipe.transform({ name: 'Bebidas', slug: 'bebidas' }) as any;
        expect(result).toBeDefined();
        expect(result.name).toBe('Bebidas');
      });
    });

    describe('updateCategorySchema', () => {
      const pipe = new ZodValidationPipe(updateCategorySchema);

      it('accepts empty body (partial update)', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('accepts partial payload', () => {
        const result = pipe.transform({ name: 'Nuevo nombre' }) as any;
        expect(result.name).toBe('Nuevo nombre');
      });

      it('rejects invalid slug in update', () => {
        expect(() => pipe.transform({ slug: 'mal!' })).toThrow(BadRequestException);
      });
    });

    describe('reorderCategoriesSchema', () => {
      const pipe = new ZodValidationPipe(reorderCategoriesSchema);

      it('rejects empty items array', () => {
        expect(() => pipe.transform({ items: [] })).toThrow(BadRequestException);
      });

      it('rejects missing items', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('accepts valid reorder payload', () => {
        const result = pipe.transform({ items: [{ id: 'c00000001abcd', displayOrder: 1 }] }) as any;
        expect(result.items).toHaveLength(1);
      });
    });

    describe('categoryFiltersSchema', () => {
      const pipe = new ZodValidationPipe(categoryFiltersSchema);

      it('accepts empty filters', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('rejects invalid isActive value', () => {
        expect(() => pipe.transform({ isActive: 'invalid' })).toThrow(BadRequestException);
      });

      it('rejects invalid page (below min)', () => {
        expect(() => pipe.transform({ page: 0 })).toThrow(BadRequestException);
      });

      it('converts isActive string "true" to boolean', () => {
        const result = pipe.transform({ isActive: 'true' }) as any;
        expect(result.isActive).toBe(true);
      });

      it('converts isActive string "false" to boolean', () => {
        const result = pipe.transform({ isActive: 'false' }) as any;
        expect(result.isActive).toBe(false);
      });
    });
  });
});
