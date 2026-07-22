import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { mockUser, mockReq, buildControllerTest } from '../test/controller-test.helper';

describe('CashController', () => {
  const serviceMock = {
    listCashRegisters: jest.fn(),
    createCashRegister: jest.fn(),
    getOpenShift: jest.fn(),
    openShift: jest.fn(),
    closeShift: jest.fn(),
    computeArqueo: jest.fn(),
    listShifts: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  describe('listRegisters', () => {
    it('delegates to service', async () => {
      serviceMock.listCashRegisters.mockResolvedValue([]);
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      await ctrl.listRegisters(req, 'branch-1');
      expect(serviceMock.listCashRegisters).toHaveBeenCalledWith({ businessId: 'biz-1', branchId: 'branch-1' });
    });
  });

  describe('createRegister', () => {
    it('delegates to service', async () => {
      serviceMock.createCashRegister.mockResolvedValue({ id: 'reg-1' });
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const dto = { branchId: 'branch-1', code: 'C01' } as any;
      await ctrl.createRegister(req, dto);
      expect(serviceMock.createCashRegister).toHaveBeenCalledWith({ businessId: 'biz-1', branchId: 'branch-1', code: 'C01', userId: 'user-1' });
    });
  });

  describe('getCurrentShift', () => {
    it('returns shift when branchId provided', async () => {
      serviceMock.getOpenShift.mockResolvedValue({ id: 'shift-1' });
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const result = await ctrl.getCurrentShift(req, 'branch-1');
      expect(serviceMock.getOpenShift).toHaveBeenCalledWith({ businessId: 'biz-1', userId: 'user-1', branchId: 'branch-1' });
      expect(result).toEqual({ shift: { id: 'shift-1' } });
    });

    it('uses defaultBranchId when no branchId param', async () => {
      serviceMock.getOpenShift.mockResolvedValue(null);
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const result = await ctrl.getCurrentShift(req, undefined);
      expect(serviceMock.getOpenShift).toHaveBeenCalledWith({ businessId: 'biz-1', userId: 'user-1', branchId: 'branch-1' });
      expect(result).toEqual({ shift: null });
    });

    it('returns null shift when no defaultBranchId', async () => {
      const userNoBranch = { ...mockUser, defaultBranchId: null };
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(userNoBranch);
      const result = await ctrl.getCurrentShift(req, undefined);
      expect(result).toEqual({ shift: null });
    });
  });

  describe('openShift', () => {
    it('delegates to service', async () => {
      serviceMock.openShift.mockResolvedValue({ id: 'shift-1' });
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const dto = { cashRegisterId: 'reg-1', openingAmount: 1000 } as any;
      const result = await ctrl.openShift(req, dto);
      expect(serviceMock.openShift).toHaveBeenCalledWith({ businessId: 'biz-1', branchId: 'branch-1', cashRegisterId: 'reg-1', userId: 'user-1', openingAmount: 1000 });
      expect(result).toEqual({ id: 'shift-1' });
    });
  });

  describe('closeShift', () => {
    it('delegates to service', async () => {
      serviceMock.closeShift.mockResolvedValue({ id: 'shift-1' });
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const dto = { closingAmount: 5000, closingNotes: 'Cierre del día' } as any;
      await ctrl.closeShift(req, 'shift-1', dto);
      expect(serviceMock.closeShift).toHaveBeenCalledWith({ businessId: 'biz-1', shiftId: 'shift-1', userId: 'user-1', closingAmount: 5000, closingNotes: 'Cierre del día' });
    });
  });

  describe('arqueo', () => {
    it('delegates to service', async () => {
      serviceMock.computeArqueo.mockResolvedValue({ total: 5000 });
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const result = await ctrl.arqueo(req, 'shift-1');
      expect(serviceMock.computeArqueo).toHaveBeenCalledWith({ businessId: 'biz-1', shiftId: 'shift-1' });
      expect(result).toEqual({ total: 5000 });
    });
  });

  describe('listShifts', () => {
    it('delegates to service with filters', async () => {
      serviceMock.listShifts.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const filters = { branchId: 'branch-1', page: 1, pageSize: 20 } as any;
      await ctrl.listShifts(req, filters);
      expect(serviceMock.listShifts).toHaveBeenCalledWith({ businessId: 'biz-1', branchId: 'branch-1', userId: undefined, status: undefined, page: 1, pageSize: 20 });
    });

    it('enforces max pageSize of 100', async () => {
      serviceMock.listShifts.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CashController, [
              { provide: CashService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const filters = { page: 1, pageSize: 999 } as any;
      await ctrl.listShifts(req, filters);
      expect(serviceMock.listShifts).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 100 }));
    });
  });
});
