import { Test } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaaSRolesGuard } from '../auth/guards/saas-roles.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<Pick<AdminService, keyof AdminService>>;

  const mockStats = { totalBusinesses: 10, totalUsers: 50, totalOrders: 200, activeSubscriptions: 8 };
  const mockBusinesses: any = {
    data: [{
      id: 'biz-1', name: 'Test', slug: 'test', email: 'test@test.com',
      status: 'ACTIVE' as any, plan: 'Sin plan', planCode: null,
      subscriptionStatus: null, usersCount: 0, branchesCount: 0, ordersCount: 0,
      createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-06-01T00:00:00.000Z',
    }],
    meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  };
  const mockDetail: any = {
    id: 'biz-1', name: 'Test', slug: 'test', legalName: null, taxId: null,
    email: 'test@test.com', phone: null, currency: 'MXN', timezone: 'America/Mexico_City',
    status: 'ACTIVE' as any, subscription: null,
    stats: { users: 3, branches: 2, orders: 50, products: 20, customers: 10 },
    createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-06-01T00:00:00.000Z',
  };
  const mockSubscription: any = {
    id: 'sub-1', businessId: 'biz-1', planId: 'plan-1', status: 'ACTIVE' as any,
    plan: { id: 'plan-1', name: 'Básico', code: 'BASIC', price: 299 as any, currency: 'MXN', isActive: true, description: null, billingPeriod: 'MONTHLY' as any, maxUsers: 5, maxBranches: 1, maxProducts: 50, maxOrdersPerMonth: 500, trialDays: 14, sortOrder: 1, features: [] as any, createdAt: new Date(), updatedAt: new Date() } as any,
    currentPeriodStart: new Date(), currentPeriodEnd: new Date(), trialEndsAt: null, cancelledAt: null, createdAt: new Date(),
  };

  const mockSeries = [{ month: '2025-01', businesses: 1, orders: 5, revenue: 100 }];
  const mockSaaSUser: any = { id: 'saas-1', email: 'admin@saas.com', role: 'SUPER_ADMIN' as any, status: 'ACTIVE' as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const mockAuditLogs: any = {
    data: [{
      id: 'log-1', createdAt: new Date(), businessId: 'biz-1',
      userId: 'user-1', entity: 'Product', entityId: 'prod-1',
      action: 'CREATE' as any, metadata: null,
    }],
    meta: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
  };

  beforeEach(async () => {
    adminService = {
      getDashboardStats: jest.fn(),
      listBusinesses: jest.fn(),
      getBusinessDetail: jest.fn(),
      assignPlan: jest.fn(),
      cancelSubscription: jest.fn(),
      updateBusiness: jest.fn(),
      listSaaSUsers: jest.fn(),
      createSaaSUser: jest.fn(),
      getDashboardSeries: jest.fn(),
      listAuditLogs: jest.fn(),
    } as any;

    const mod = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(SaaSRolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = mod.get(AdminController);
  });

  it('getDashboardStats delegates to service', async () => {
    adminService.getDashboardStats.mockResolvedValue(mockStats);
    const result = await controller.getDashboardStats();
    expect(adminService.getDashboardStats).toHaveBeenCalled();
    expect(result).toEqual(mockStats);
  });

  it('listBusinesses delegates with parsed query params', async () => {
    adminService.listBusinesses.mockResolvedValue(mockBusinesses);
    const result = await controller.listBusinesses('1', '20', undefined, undefined);
    expect(adminService.listBusinesses).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: undefined, status: undefined });
    expect(result).toEqual(mockBusinesses);
  });

  it('listBusinesses defaults to page 1 / 20', async () => {
    adminService.listBusinesses.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });
    await controller.listBusinesses(undefined, undefined, undefined, undefined);
    expect(adminService.listBusinesses).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: undefined, status: undefined });
  });

  it('getBusinessDetail delegates with id', async () => {
    adminService.getBusinessDetail.mockResolvedValue(mockDetail);
    const result = await controller.getBusinessDetail('biz-1');
    expect(adminService.getBusinessDetail).toHaveBeenCalledWith('biz-1');
    expect(result).toEqual(mockDetail);
  });

  it('assignPlan delegates with id and planId', async () => {
    adminService.assignPlan.mockResolvedValue(mockSubscription);
    const result = await controller.assignPlan('biz-1', { planId: 'plan-1' });
    expect(adminService.assignPlan).toHaveBeenCalledWith('biz-1', 'plan-1');
    expect(result).toEqual(mockSubscription);
  });

  it('cancelSubscription delegates with id', async () => {
    adminService.cancelSubscription.mockResolvedValue(mockSubscription);
    const result = await controller.cancelSubscription('biz-1');
    expect(adminService.cancelSubscription).toHaveBeenCalledWith('biz-1');
    expect(result).toEqual(mockSubscription);
  });

  it('updateBusiness delegates with id and body', async () => {
    adminService.updateBusiness.mockResolvedValue({ id: 'biz-1', name: 'Updated', slug: 'test', legalName: null, taxId: null, email: 'test@test.com', phone: null, currency: 'MXN', timezone: 'America/Mexico_City', status: 'ACTIVE' as any, createdAt: new Date(), updatedAt: new Date() } as any);
    const result = await controller.updateBusiness('biz-1', { name: 'Updated', status: 'SUSPENDED' });
    expect(adminService.updateBusiness).toHaveBeenCalledWith('biz-1', { name: 'Updated', status: 'SUSPENDED' });
    expect(result.name).toBe('Updated');
  });

  it('listSaaSUsers delegates with parsed params', async () => {
    adminService.listSaaSUsers.mockResolvedValue({ data: [mockSaaSUser], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
    const result = await controller.listSaaSUsers('1', '20');
    expect(adminService.listSaaSUsers).toHaveBeenCalledWith(1, 20);
    expect(result.data).toHaveLength(1);
  });

  it('createSaaSUser delegates with body', async () => {
    adminService.createSaaSUser.mockResolvedValue(mockSaaSUser);
    const result = await controller.createSaaSUser({ email: 'admin@saas.com', password: 'Secret123!', role: 'SUPER_ADMIN' });
    expect(adminService.createSaaSUser).toHaveBeenCalledWith('admin@saas.com', 'Secret123!', 'SUPER_ADMIN');
    expect(result.email).toBe('admin@saas.com');
  });

  it('getDashboardSeries delegates to service', async () => {
    adminService.getDashboardSeries.mockResolvedValue(mockSeries);
    const result = await controller.getDashboardSeries();
    expect(adminService.getDashboardSeries).toHaveBeenCalled();
    expect(result).toEqual(mockSeries);
  });

  it('listAuditLogs delegates with query params', async () => {
    adminService.listAuditLogs.mockResolvedValue(mockAuditLogs);
    const result = await controller.listAuditLogs('1', '50', 'CREATE', 'Product');
    expect(adminService.listAuditLogs).toHaveBeenCalledWith(1, 50, { action: 'CREATE', entity: 'Product' });
    expect(result.meta.total).toBe(1);
  });
});
