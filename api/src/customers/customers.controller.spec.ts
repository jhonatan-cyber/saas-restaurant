import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createCustomerSchema, updateCustomerSchema, customerFiltersSchema } from '@saas/shared';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { buildControllerTest, createTestUser, createTestContext } from '../test/controller-test.helper';

const mockUser = createTestUser({ role: 'CAJERO' as const });
const mockCtx = createTestContext();

describe('CustomersController', () => {
  const serviceMock = {
    list: jest.fn(), search: jest.fn(), getById: jest.fn(),
    create: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service with filters', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      const filters = { page: 1 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('search', () => {
    it('delegates to service with q and default limit', async () => {
      serviceMock.search.mockResolvedValue([]);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await ctrl.search(mockUser, mockCtx, 'Juan', undefined);
      expect(serviceMock.search).toHaveBeenCalledWith(mockUser, mockCtx, 'Juan', 20);
    });

    it('parses and caps limit to 50', async () => {
      serviceMock.search.mockResolvedValue([]);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await ctrl.search(mockUser, mockCtx, 'Test', '100');
      expect(serviceMock.search).toHaveBeenCalledWith(mockUser, mockCtx, 'Test', 50);
    });

    it('passes through errors from service', async () => {
      serviceMock.search.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await expect(ctrl.search(mockUser, mockCtx, 'x', '1')).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service with id', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'cust-1', name: 'Juan' });
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'cust-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'cust-1');
      expect(result).toEqual({ id: 'cust-1', name: 'Juan' });
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'cust-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service with dto', async () => {
      serviceMock.create.mockResolvedValue({ id: 'cust-1' });
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      const dto = { name: 'Juan', phone: '555-1234' } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('update', () => {
    it('delegates to service with id and dto', async () => {
      serviceMock.update.mockResolvedValue({ id: 'cust-1' });
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      const dto = { name: 'Juan Updated' } as any;
      await ctrl.update(mockUser, mockCtx, 'cust-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'cust-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await expect(ctrl.update(mockUser, mockCtx, 'cust-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('remove', () => {
    it('delegates to service for soft delete', async () => {
      serviceMock.softDelete.mockResolvedValue(undefined);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await ctrl.remove(mockUser, mockCtx, 'cust-1');
      expect(serviceMock.softDelete).toHaveBeenCalledWith(mockUser, mockCtx, 'cust-1');
    });

    it('passes through errors from service', async () => {
      serviceMock.softDelete.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(CustomersController, [
              { provide: CustomersService, useValue: serviceMock },
            ]);
      await expect(ctrl.remove(mockUser, mockCtx, 'cust-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  ZodValidationPipe — payload validation
  // ═════════════════════════════════════════════════════════════════
  describe('validation', () => {
    describe('createCustomerSchema', () => {
      const pipe = new ZodValidationPipe(createCustomerSchema);

      it('rejects empty body (missing name)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('accepts valid payload', () => {
        const result = pipe.transform({ name: 'Juan Pérez' }) as any;
        expect(result.name).toBe('Juan Pérez');
      });

      it('accepts payload with optional fields', () => {
        const result = pipe.transform({ name: 'Juan Pérez', phone: '555-1234', email: 'juan@test.com' }) as any;
        expect(result.email).toBe('juan@test.com');
      });
    });

    describe('updateCustomerSchema', () => {
      const pipe = new ZodValidationPipe(updateCustomerSchema);

      it('accepts empty body (partial update)', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('accepts partial payload', () => {
        const result = pipe.transform({ name: 'Nuevo nombre' }) as any;
        expect(result.name).toBe('Nuevo nombre');
      });
    });

    describe('customerFiltersSchema', () => {
      const pipe = new ZodValidationPipe(customerFiltersSchema);

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
