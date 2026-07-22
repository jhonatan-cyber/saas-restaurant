import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { buildControllerTest, createTestUser } from '../test/controller-test.helper';

const mockUser = createTestUser({ branchIds: [], defaultBranchId: null });

describe('AuditController', () => {
  const serviceMock = {
    query: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('delegates to AuditService with businessId and default pagination', async () => {
      const mockResult = { data: [], total: 0, page: 1, pageSize: 30 };
      serviceMock.query.mockResolvedValue(mockResult);

      const controller = await buildControllerTest(AuditController, [
              { provide: AuditService, useValue: serviceMock },
            ]);
      const result = await controller.list(mockUser, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);

      expect(serviceMock.query).toHaveBeenCalledWith({
        businessId: 'biz-1',
        page: 1,
        pageSize: 30,
        entity: undefined,
        entityId: undefined,
        action: undefined,
        userId: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      });
      expect(result).toEqual(mockResult);
    });

    it('passes query filters to AuditService', async () => {
      serviceMock.query.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 10 });

      const controller = await buildControllerTest(AuditController, [
              { provide: AuditService, useValue: serviceMock },
            ]);
      await controller.list(
        mockUser,
        '2',   // page
        '10',  // pageSize
        'Order', // entity
        'ord-1', // entityId
        'CREATE', // action
        'usr-1', // userId
        '2024-01-01', // dateFrom
        '2024-12-31', // dateTo
      );

      expect(serviceMock.query).toHaveBeenCalledWith({
        businessId: 'biz-1',
        page: 2,
        pageSize: 10,
        entity: 'Order',
        entityId: 'ord-1',
        action: 'CREATE',
        userId: 'usr-1',
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
      });
    });

    it('passes through errors from AuditService', async () => {
      const error = new Error('Error al consultar auditoría');
      serviceMock.query.mockRejectedValue(error);

      const controller = await buildControllerTest(AuditController, [
              { provide: AuditService, useValue: serviceMock },
            ]);
      await expect(controller.list(mockUser, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined)).rejects.toThrow(error);
    });
  });
});
