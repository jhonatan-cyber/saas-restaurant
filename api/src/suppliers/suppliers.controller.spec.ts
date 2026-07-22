import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createSupplierSchema, updateSupplierSchema, supplierFiltersSchema } from '@saas/shared';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('SuppliersController', () => {
  const serviceMock = {
    list: jest.fn(), listAll: jest.fn(), getById: jest.fn(),
    create: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      const filters = { page: 1 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('listAll', () => {
    it('delegates with parsed params', async () => {
      serviceMock.listAll.mockResolvedValue([]);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await ctrl.listAll(mockUser, mockCtx, 'true', '1', '20');
      expect(serviceMock.listAll).toHaveBeenCalledWith(mockUser, mockCtx, { isActive: true, page: 1, pageSize: 20 });
    });

    it('passes through errors from service', async () => {
      serviceMock.listAll.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await expect(ctrl.listAll(mockUser, mockCtx, undefined, undefined, undefined)).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'sup-1', name: 'Distribuidora' });
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'sup-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'sup-1');
      expect(result).toEqual({ id: 'sup-1', name: 'Distribuidora' });
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'sup-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service', async () => {
      serviceMock.create.mockResolvedValue({ id: 'sup-new' });
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      const dto = { name: 'Distribuidora ABC', phone: '555-0000' } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      serviceMock.update.mockResolvedValue({ id: 'sup-1' });
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      const dto = { name: 'Updated' } as any;
      await ctrl.update(mockUser, mockCtx, 'sup-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'sup-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await expect(ctrl.update(mockUser, mockCtx, 'sup-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('remove', () => {
    it('delegates soft delete', async () => {
      serviceMock.softDelete.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await ctrl.remove(mockUser, mockCtx, 'sup-1');
      expect(serviceMock.softDelete).toHaveBeenCalledWith(mockUser, mockCtx, 'sup-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.softDelete.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(SuppliersController, [
              { provide: SuppliersService, useValue: serviceMock },
            ]);
      await expect(ctrl.remove(mockUser, mockCtx, 'sup-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  ZodValidationPipe — payload validation
  // ═════════════════════════════════════════════════════════════════
  describe('validation', () => {
    describe('createSupplierSchema', () => {
      const pipe = new ZodValidationPipe(createSupplierSchema);

      it('rejects empty body (missing name)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('accepts valid payload', () => {
        const result = pipe.transform({ name: 'Distribuidora ABC' }) as any;
        expect(result.name).toBe('Distribuidora ABC');
      });

      it('accepts payload with all fields', () => {
        const result = pipe.transform({
          name: 'Distribuidora ABC',
          phone: '555-0000',
          email: 'contacto@abc.com',
        }) as any;
        expect(result.email).toBe('contacto@abc.com');
      });
    });

    describe('updateSupplierSchema', () => {
      const pipe = new ZodValidationPipe(updateSupplierSchema);

      it('accepts empty body (partial update)', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('accepts partial payload', () => {
        const result = pipe.transform({ name: 'Nuevo nombre' }) as any;
        expect(result.name).toBe('Nuevo nombre');
      });
    });

    describe('supplierFiltersSchema', () => {
      const pipe = new ZodValidationPipe(supplierFiltersSchema);

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
