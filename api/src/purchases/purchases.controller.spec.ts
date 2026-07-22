import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createPurchaseSchema, updatePurchaseSchema, purchaseFiltersSchema } from '@saas/shared';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

const serverError = new Error('Server error');

describe('PurchasesController', () => {
  const serviceMock = {
    list: jest.fn(), getById: jest.fn(), create: jest.fn(),
    update: jest.fn(), complete: jest.fn(), cancel: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      const filters = { page: 1 } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });

    it('passes through errors from service', async () => {
      serviceMock.list.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      await expect(ctrl.list(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('getOne', () => {
    it('delegates to service', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'pur-1', total: 500 });
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      const result = await ctrl.getOne(mockUser, mockCtx, 'pur-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'pur-1');
      expect(result).toEqual({ id: 'pur-1', total: 500 });
    });

    it('passes through errors from service', async () => {
      serviceMock.getById.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      await expect(ctrl.getOne(mockUser, mockCtx, 'pur-1')).rejects.toThrow(serverError);
    });
  });

  describe('create', () => {
    it('delegates to service', async () => {
      serviceMock.create.mockResolvedValue({ id: 'pur-new' });
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      const dto = { supplierId: 'sup-1', items: [] } as any;
      await ctrl.create(mockUser, mockCtx, dto);
      expect(serviceMock.create).toHaveBeenCalledWith(mockUser, mockCtx, dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.create.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      await expect(ctrl.create(mockUser, mockCtx, {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      serviceMock.update.mockResolvedValue({ id: 'pur-1' });
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      const dto = { notes: 'Updated' } as any;
      await ctrl.update(mockUser, mockCtx, 'pur-1', dto);
      expect(serviceMock.update).toHaveBeenCalledWith(mockUser, mockCtx, 'pur-1', dto);
    });

    it('passes through errors from service', async () => {
      serviceMock.update.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      await expect(ctrl.update(mockUser, mockCtx, 'pur-1', {} as any)).rejects.toThrow(serverError);
    });
  });

  describe('complete', () => {
    it('delegates to service with id and optional date', async () => {
      serviceMock.complete.mockResolvedValue({ id: 'pur-1', status: 'COMPLETED' });
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      const result = await ctrl.complete(mockUser, mockCtx, 'pur-1', '2024-06-01');
      expect(serviceMock.complete).toHaveBeenCalledWith(mockUser, mockCtx, 'pur-1', '2024-06-01');
      expect(result).toEqual({ id: 'pur-1', status: 'COMPLETED' });
    });

    it('works without receivedAt date', async () => {
      serviceMock.complete.mockResolvedValue({ id: 'pur-1', status: 'COMPLETED' });
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      await ctrl.complete(mockUser, mockCtx, 'pur-1', undefined);
      expect(serviceMock.complete).toHaveBeenCalledWith(mockUser, mockCtx, 'pur-1', undefined);
    });

    it('passes through errors from service', async () => {
      serviceMock.complete.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      await expect(ctrl.complete(mockUser, mockCtx, 'pur-1', '2024-06-01')).rejects.toThrow(serverError);
    });
  });

  describe('cancel', () => {
    it('delegates to service', async () => {
      serviceMock.cancel.mockResolvedValue({ id: 'pur-1', status: 'CANCELLED' });
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      const result = await ctrl.cancel(mockUser, mockCtx, 'pur-1');
      expect(serviceMock.cancel).toHaveBeenCalledWith(mockUser, mockCtx, 'pur-1');
      expect(result).toEqual({ id: 'pur-1', status: 'CANCELLED' });
    });

    it('passes through errors from service', async () => {
      serviceMock.cancel.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(PurchasesController, [
        { provide: PurchasesService, useValue: serviceMock },
      ]);
      await expect(ctrl.cancel(mockUser, mockCtx, 'pur-1')).rejects.toThrow(serverError);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  ZodValidationPipe — payload validation
  // ═════════════════════════════════════════════════════════════════
  describe('validation', () => {
    describe('createPurchaseSchema', () => {
      const pipe = new ZodValidationPipe(createPurchaseSchema);

      it('rejects empty body (missing branchId/purchaseNumber/items)', () => {
        expect(() => pipe.transform({})).toThrow(BadRequestException);
      });

      it('rejects body missing items', () => {
        expect(() =>
          pipe.transform({ branchId: 'branch-1', purchaseNumber: 'P-001', items: [] }),
        ).toThrow(BadRequestException);
      });

      it('accepts valid payload with items', () => {
        const result = pipe.transform({
          branchId: 'c000000001abcd',
          purchaseNumber: 'P-001',
          items: [{ productId: 'c00000001abcd', quantity: 10, unitCost: 5 }],
        }) as any;
        expect(result.purchaseNumber).toBe('P-001');
      });
    });

    describe('updatePurchaseSchema', () => {
      const pipe = new ZodValidationPipe(updatePurchaseSchema);

      it('accepts empty body (partial update)', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('accepts partial payload', () => {
        const result = pipe.transform({ notes: 'Updated notes' }) as any;
        expect(result.notes).toBe('Updated notes');
      });

      it('rejects invalid status value', () => {
        expect(() => pipe.transform({ status: 'INVALID' })).toThrow(BadRequestException);
      });

      it('accepts valid status transition', () => {
        const result = pipe.transform({ status: 'COMPLETED' }) as any;
        expect(result.status).toBe('COMPLETED');
      });
    });

    describe('purchaseFiltersSchema', () => {
      const pipe = new ZodValidationPipe(purchaseFiltersSchema);

      it('accepts empty filters', () => {
        const result = pipe.transform({}) as any;
        expect(result).toBeDefined();
      });

      it('rejects invalid page (below min)', () => {
        expect(() => pipe.transform({ page: 0 })).toThrow(BadRequestException);
      });

      it('accepts valid filters', () => {
        const result = pipe.transform({ status: 'PENDING', branchId: 'c000000001abcd' }) as any;
        expect(result.branchId).toBe('c000000001abcd');
      });
    });
  });
});
