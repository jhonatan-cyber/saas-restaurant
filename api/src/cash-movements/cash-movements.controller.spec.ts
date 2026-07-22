import { CashMovementsController } from './cash-movements.controller';
import { CashMovementsService } from './cash-movements.service';
import { mockUser, mockReq, buildControllerTest } from '../test/controller-test.helper';

describe('CashMovementsController', () => {
  const serviceMock = {
    create: jest.fn(),
    list: jest.fn(),
    getSummary: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  describe('create', () => {
    it('delegates to service', async () => {
      serviceMock.create.mockResolvedValue({ id: 'mov-1' });
      const ctrl = await buildControllerTest(CashMovementsController, [
              { provide: CashMovementsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const dto = { branchId: 'branch-1', type: 'INCOME', amount: 500, description: 'Venta' } as any;
      await ctrl.create(req, dto);
      expect(serviceMock.create).toHaveBeenCalledWith({ businessId: 'biz-1', userId: 'user-1', dto });
    });
  });

  describe('list', () => {
    it('delegates to service with filters', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CashMovementsController, [
              { provide: CashMovementsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const filters = { branchId: 'branch-1', page: 1, pageSize: 20 } as any;
      await ctrl.list(req, filters);
      expect(serviceMock.list).toHaveBeenCalledWith({
        businessId: 'biz-1', branchId: 'branch-1', shiftId: undefined,
        type: undefined, category: undefined, dateFrom: undefined, dateTo: undefined,
        page: 1, pageSize: 20,
      });
    });

    it('enforces max pageSize of 100', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CashMovementsController, [
              { provide: CashMovementsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const filters = { page: 1, pageSize: 999 } as any;
      await ctrl.list(req, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 100 }));
    });

    it('parses date strings to Date objects', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(CashMovementsController, [
              { provide: CashMovementsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const filters = { dateFrom: '2024-01-01', dateTo: '2024-12-31', page: 1 } as any;
      await ctrl.list(req, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(expect.objectContaining({
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
      }));
    });
  });

  describe('summary', () => {
    it('delegates to service', async () => {
      serviceMock.getSummary.mockResolvedValue({ totalIncome: 5000, totalExpense: 2000 });
      const ctrl = await buildControllerTest(CashMovementsController, [
              { provide: CashMovementsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const result = await ctrl.summary(req, 'branch-1', 'shift-1');
      expect(serviceMock.getSummary).toHaveBeenCalledWith({ businessId: 'biz-1', branchId: 'branch-1', shiftId: 'shift-1' });
      expect(result).toEqual({ totalIncome: 5000, totalExpense: 2000 });
    });
  });
});
