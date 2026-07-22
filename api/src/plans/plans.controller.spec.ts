import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { buildControllerTest } from '../test/controller-test.helper';

describe('PlansController', () => {
  const serviceMock = {
    create: jest.fn(),
    list: jest.fn(),
    listPublic: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('delegates to PlansService with dto', async () => {
      const mockPlan = { id: 'plan-1', name: 'Pro', price: 2999 };
      serviceMock.create.mockResolvedValue(mockPlan);

      const controller = await buildControllerTest(PlansController, [
              { provide: PlansService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const dto = { name: 'Pro', price: 2999, currency: 'MXN' };
      const result = await controller.create(dto as any);

      expect(serviceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockPlan);
    });
  });

  describe('list', () => {
    it('delegates to PlansService with filters', async () => {
      serviceMock.list.mockResolvedValue({ data: [], total: 0 });

      const controller = await buildControllerTest(PlansController, [
              { provide: PlansService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const filters = { page: 1, pageSize: 20 };
      const result = await controller.list(filters as any);

      expect(serviceMock.list).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('listPublic', () => {
    it('delegates to PlansService without auth', async () => {
      const mockPlans = [{ id: 'plan-free', name: 'Free', price: 0 }];
      serviceMock.listPublic.mockResolvedValue(mockPlans);

      const controller = await buildControllerTest(PlansController, [
              { provide: PlansService, useValue: serviceMock },
            ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const result = await controller.listPublic();

      expect(serviceMock.listPublic).toHaveBeenCalled();
      expect(result).toEqual(mockPlans);
    });
  });

  describe('getById', () => {
    it('delegates to PlansService with id', async () => {
      const mockPlan = { id: 'plan-1', name: 'Pro' };
      serviceMock.getById.mockResolvedValue(mockPlan);

      const controller = await buildControllerTest(PlansController, [
              { provide: PlansService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const result = await controller.getById('plan-1');

      expect(serviceMock.getById).toHaveBeenCalledWith('plan-1');
      expect(result).toEqual(mockPlan);
    });
  });

  describe('update', () => {
    it('delegates to PlansService with id and dto', async () => {
      const dto = { price: 1999 };
      serviceMock.update.mockResolvedValue({ id: 'plan-1', ...dto });

      const controller = await buildControllerTest(PlansController, [
              { provide: PlansService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const result = await controller.update('plan-1', dto as any);

      expect(serviceMock.update).toHaveBeenCalledWith('plan-1', dto);
      expect(result).toEqual({ id: 'plan-1', price: 1999 });
    });
  });

  describe('remove', () => {
    it('delegates to PlansService with id', async () => {
      serviceMock.remove.mockResolvedValue({ id: 'plan-1', isActive: false });

      const controller = await buildControllerTest(PlansController, [
              { provide: PlansService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const result = await controller.remove('plan-1');

      expect(serviceMock.remove).toHaveBeenCalledWith('plan-1');
      expect(result).toEqual({ id: 'plan-1', isActive: false });
    });
  });
});
