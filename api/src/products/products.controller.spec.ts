import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createProductSchema, updateProductSchema, productFiltersSchema } from '@saas/shared';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('ProductsController', () => {
  const serviceMock = {
    list: jest.fn(), listAll: jest.fn(), listLowStock: jest.fn(), getById: jest.fn(),
    create: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      const filters = { page: 1 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('listAll', () => {
    it('delegates with parsed query params', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, 'cat-1', 'true', '1', '20');
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { categoryId: 'cat-1', isAvailable: true, page: 1, pageSize: 20 });
    });

    it('omits undefined params', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined, undefined);
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, {});
    });

    it('parses isAvailable=false string correctly', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(ProductsController, [
        { provide: ProductsService, useValue: serviceMock },
      ]);
      await ctrl.listAll(mockUser, mockCtx, undefined, 'false', undefined, undefined);
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { isAvailable: false });
    });

    it('parses isAvailable as undefined for non-boolean strings', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(ProductsController, [
        { provide: ProductsService, useValue: serviceMock },
      ]);
      // 'maybe' no es 'true' ni 'false' → undefined
      await ctrl.listAll(mockUser, mockCtx, undefined, 'maybe', undefined, undefined);
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, {});
    });

    it('parses page and pageSize as numbers', async () => {
      serviceMock.listAll.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(ProductsController, [
        { provide: ProductsService, useValue: serviceMock },
      ]);
      await ctrl.listAll(mockUser, mockCtx, undefined, undefined, '2', '50');
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { page: 2, pageSize: 50 });
    });

    it('passes through errors from service', async () => {
      serviceMock.listAll.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await expect(ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined, undefined)).rejects.toThrow(serverError);
    });
  });

  describe('lowStock', () => {
    it('delegates to service', async () => {
      serviceMock.listLowStock.mockResolvedValue([]);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await ctrl.lowStock(mockUser, mockCtx);
      expect(serviceMock.listLowStock).toHaveBeenCalledWith(mockUser, mockCtx);
    });

    it('passes through errors from service', async () => {
      serviceMock.listLowStock.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await expect(ctrl.lowStock(mockUser, mockCtx)).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'prod-1', name: 'Coca Cola' });
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'prod-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'prod-1');
      expect(result).toEqual({ id: 'prod-1', name: 'Coca Cola' });
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'prod-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service', async () => {
      serviceMock.create.mockResolvedValue({ id: 'prod-new' });
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      const dto = { name: 'Nuevo Producto', price: 100 } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });

    it('throws ForbiddenException when quota exceeded (maxProducts)', async () => {
      const quotaError = new ForbiddenException('Límite del plan excedido: máximo 50 products. Actual: 50. Actualiza tu plan para aumentar el límite.');
      serviceMock.create.mockRejectedValue(quotaError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      const dto = { name: 'Otro Producto', price: 50 } as any;
      await expect(ctrl.create(mockUser, mockCtx, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      serviceMock.update.mockResolvedValue({ id: 'prod-1' });
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      const dto = { price: 150 } as any;
      await ctrl.update(mockUser, mockCtx, 'prod-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'prod-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await expect(ctrl.update(mockUser, mockCtx, 'prod-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('remove', () => {
    it('delegates soft delete', async () => {
      serviceMock.softDelete.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await ctrl.remove(mockUser, mockCtx, 'prod-1');
      expect(serviceMock.softDelete).toHaveBeenCalledWith(mockUser, mockCtx, 'prod-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.softDelete.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(ProductsController, [
              { provide: ProductsService, useValue: serviceMock },
            ]);
      await expect(ctrl.remove(mockUser, mockCtx, 'prod-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  Guards — verify Roles decorator is present
  // ═════════════════════════════════════════════════════════════════
  describe('guards', () => {
    it('requires OWNER or ADMIN role for create', () => {
      const roles = Reflect.getMetadata('required-roles', ProductsController.prototype.create);
      expect(roles).toBeDefined();
      expect(roles).toContain('OWNER');
      expect(roles).toContain('ADMIN');
    });

    it('requires OWNER or ADMIN role for update', () => {
      const roles = Reflect.getMetadata('required-roles', ProductsController.prototype.update);
      expect(roles).toBeDefined();
      expect(roles).toContain('OWNER');
      expect(roles).toContain('ADMIN');
    });

    it('requires OWNER or ADMIN role for remove', () => {
      const roles = Reflect.getMetadata('required-roles', ProductsController.prototype.remove);
      expect(roles).toBeDefined();
      expect(roles).toContain('OWNER');
      expect(roles).toContain('ADMIN');
    });

    it('does NOT require roles for list', () => {
      const roles = Reflect.getMetadata('required-roles', ProductsController.prototype.list);
      expect(roles).toBeUndefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  ZodValidationPipe — payload validation
  // ═════════════════════════════════════════════════════════════════
  describe('validation', () => {
    describe('createProductSchema', () => {
      const pipe = new ZodValidationPipe(createProductSchema);

      it('rejects empty body (missing name/slug/price)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('rejects body with only name (missing slug/price)', () => {
        expect(() => pipe.transform({ name: 'Coca Cola' })).toThrow(BadRequestException);
      });

      it('accepts valid payload', () => {
        const result = pipe.transform({ name: 'Coca Cola', slug: 'coca-cola', price: 10 }) as any;
        expect(result).toBeDefined();
        expect(result.name).toBe('Coca Cola');
      });
    });

    describe('updateProductSchema', () => {
      const pipe = new ZodValidationPipe(updateProductSchema);

      it('accepts empty body (partial update)', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('accepts partial payload', () => {
        const result = pipe.transform({ price: 150 }) as any;
        expect(result.price).toBe(150);
      });

      it('rejects invalid slug in update', () => {
        expect(() => pipe.transform({ slug: 'mal!' })).toThrow(BadRequestException);
      });
    });

    describe('productFiltersSchema', () => {
      const pipe = new ZodValidationPipe(productFiltersSchema);

      it('accepts empty filters', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('rejects invalid isActive value', () => {
        expect(() => pipe.transform({ isActive: 'invalid' })).toThrow(BadRequestException);
      });

      it('rejects invalid isAvailable value', () => {
        expect(() => pipe.transform({ isAvailable: 'nope' })).toThrow(BadRequestException);
      });

      it('converts isActive/isAvailable strings to booleans', () => {
        const result = pipe.transform({ isActive: 'true', isAvailable: 'false' }) as any;
        expect(result.isActive).toBe(true);
        expect(result.isAvailable).toBe(false);
      });
    });
  });
});
