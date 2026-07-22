import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('ReportsController', () => {
  const serviceMock = {
    list: jest.fn(),
    getById: jest.fn(),
    request: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  describe('list', () => {
    it('delegates to service with filters', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });
      const ctrl = await buildControllerTest(ReportsController, [
              { provide: ReportsService, useValue: serviceMock },
            ]);
      const filters = { page: 1, type: 'sales_daily' } as any;
      await ctrl.list(mockUser, mockCtx, filters);
      expect(serviceMock.list).toHaveBeenCalledWith(mockUser, mockCtx, filters);
    });
  });

  describe('getById', () => {
    it('delegates to service with id', async () => {
      serviceMock.getById.mockResolvedValue({ id: 'rpt-1', type: 'sales_daily' });
      const ctrl = await buildControllerTest(ReportsController, [
              { provide: ReportsService, useValue: serviceMock },
            ]);
      const result = await ctrl.getById(mockUser, mockCtx, 'rpt-1');
      expect(serviceMock.getById).toHaveBeenCalledWith(mockUser, mockCtx, 'rpt-1');
      expect(result).toEqual({ id: 'rpt-1', type: 'sales_daily' });
    });
  });

  describe('request', () => {
    it('delegates to service with dto', async () => {
      serviceMock.request.mockResolvedValue({ id: 'rpt-new', status: 'PENDING' });
      const ctrl = await buildControllerTest(ReportsController, [
              { provide: ReportsService, useValue: serviceMock },
            ]);
      const dto = { type: 'sales_daily', filters: {} } as any;
      const result = await ctrl.request(mockUser, mockCtx, dto);
      expect(serviceMock.request).toHaveBeenCalledWith(mockUser, mockCtx, dto);
      expect(result).toEqual({ id: 'rpt-new', status: 'PENDING' });
    });
  });
});
