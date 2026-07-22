import type { Response } from 'express';
import { PosStationsController } from './pos-stations.controller';
import { PosStationsService } from './pos-stations.service';
import { AuthCookiesService } from '../auth/services/auth-cookies.service';
import { mockUser, mockCtx, mockRes, buildControllerTest } from '../test/controller-test.helper';

describe('PosStationsController', () => {
  const stationServiceMock = {
    stationLogin: jest.fn(),
    activate: jest.fn(),
    generate: jest.fn(),
    list: jest.fn(),
  };

  const authCookiesMock = {
    setAuthCookies: jest.fn(),
    setAccessCookie: jest.fn(),
    setRefreshCookie: jest.fn(),
    setCsrfCookie: jest.fn(),
    clearAuthCookies: jest.fn(),
    refreshCookiePath: '/api/auth/refresh',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stationLogin', () => {
    it('delegates to PosStationsService and sets auth cookies', async () => {
      const mockResult = {
        accessToken: 'station-access-token',
        refreshToken: 'station-refresh-token',
        user: { id: 'user-1', email: 'station@test.com' },
      };
      stationServiceMock.stationLogin.mockResolvedValue(mockResult);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });

      const dto = { businessSig: 'station-jwt-token' };
      const res = mockRes();

      const result = await controller.stationLogin(dto, res);

      // 1. Delega al service con el businessSig
      expect(stationServiceMock.stationLogin).toHaveBeenCalledWith('station-jwt-token');

      // 2. Setea cookies via AuthCookiesService
      expect(authCookiesMock.setAuthCookies).toHaveBeenCalledWith(
        res,
        'station-access-token',
        'station-refresh-token',
      );

      // 3. Devuelve el resultado del service
      expect(result).toEqual(mockResult);
    });

    it('passes through errors from PosStationsService', async () => {
      const authError = new Error('Token de estación inválido');
      stationServiceMock.stationLogin.mockRejectedValue(authError);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });

      const dto = { businessSig: 'invalid-token' };
      const res = mockRes();

      await expect(controller.stationLogin(dto, res)).rejects.toThrow(authError);

      // No debe setear cookies si falló el login
      expect(authCookiesMock.setAuthCookies).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('delegates to PosStationsService with businessSlug and stationCode', async () => {
      const mockResult = {
        stationId: 'station-1',
        branchId: 'branch-1',
        branchName: 'Sucursal Centro',
        businessSig: 'signed-jwt-token',
      };
      stationServiceMock.activate.mockResolvedValue(mockResult);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const dto = {
        businessSlug: 'mi-restaurante',
        stationCode: 'ABC123',
      };

      const result = await controller.activate(dto);

      // 1. Delega al service con los parámetros correctos
      expect(stationServiceMock.activate).toHaveBeenCalledWith({
        businessSlug: 'mi-restaurante',
        stationCode: 'ABC123',
      });

      // 2. Devuelve el resultado del service
      expect(result).toEqual(mockResult);
    });

    it('passes through deviceName when provided', async () => {
      stationServiceMock.activate.mockResolvedValue({
        stationId: 'station-1',
        branchId: 'branch-1',
        branchName: 'Sucursal Centro',
        businessSig: 'signed-jwt-token',
      });

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const dto = {
        businessSlug: 'mi-restaurante',
        stationCode: 'ABC123',
        deviceName: 'POS-Cocina-01',
      };

      await controller.activate(dto);

      expect(stationServiceMock.activate).toHaveBeenCalledWith({
        businessSlug: 'mi-restaurante',
        stationCode: 'ABC123',
        deviceName: 'POS-Cocina-01',
      });
    });

    it('passes through errors from PosStationsService', async () => {
      const notFound = new Error('Business no encontrado');
      stationServiceMock.activate.mockRejectedValue(notFound);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const dto = {
        businessSlug: 'inexistente',
        stationCode: 'ZZZ999',
      };

      await expect(controller.activate(dto)).rejects.toThrow(notFound);
    });
  });

  describe('generate', () => {
    it('delegates to PosStationsService with user businessId and body params', async () => {
      const mockStation = {
        id: 'station-1',
        stationCode: 'DEF456',
        branchId: 'branch-1',
        businessId: 'biz-1',
        name: 'POS Principal',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      stationServiceMock.generate.mockResolvedValue(mockStation);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);
      const dto = { branchId: 'branch-1', name: 'POS Principal' };

      const result = await controller.generate(mockUser, mockCtx, dto);

      // 1. Delega al service con businessId del JWT + branch/name del body
      expect(stationServiceMock.generate).toHaveBeenCalledWith({
        businessId: 'biz-1',
        branchId: 'branch-1',
        name: 'POS Principal',
      });

      // 2. Devuelve el resultado del service
      expect(result).toEqual(mockStation);
    });

    it('passes null name when not provided', async () => {
      stationServiceMock.generate.mockResolvedValue({
        id: 'station-2',
        stationCode: 'GHI789',
        branchId: 'branch-2',
        businessId: 'biz-1',
        name: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);
      const dto = { branchId: 'branch-2' };

      await controller.generate(mockUser, mockCtx, dto);

      expect(stationServiceMock.generate).toHaveBeenCalledWith({
        businessId: 'biz-1',
        branchId: 'branch-2',
        name: null,
      });
    });

    it('passes through errors from PosStationsService', async () => {
      const notFound = new Error('Sucursal no encontrada en este negocio');
      stationServiceMock.generate.mockRejectedValue(notFound);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);
      const dto = { branchId: 'branch-inexistente' };

      await expect(controller.generate(mockUser, mockCtx, dto)).rejects.toThrow(notFound);
    });
  });

  describe('list', () => {
    it('delegates to PosStationsService with businessId from user', async () => {
      const mockStations = [
        {
          id: 'station-1',
          stationCode: 'DEF456',
          branchId: 'branch-1',
          businessId: 'biz-1',
          name: 'POS Principal',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          branch: { id: 'branch-1', name: 'Centro', code: 'C01' },
        },
      ];
      stationServiceMock.list.mockResolvedValue(mockStations);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);

      const result = await controller.list(mockUser, mockCtx, undefined, undefined);

      expect(stationServiceMock.list).toHaveBeenCalledWith({
        businessId: 'biz-1',
        branchId: undefined,
        isActive: undefined,
      });
      expect(result).toEqual(mockStations);
    });

    it('passes branchId query param', async () => {
      stationServiceMock.list.mockResolvedValue([]);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);

      await controller.list(mockUser, mockCtx, 'branch-2', undefined);

      expect(stationServiceMock.list).toHaveBeenCalledWith({
        businessId: 'biz-1',
        branchId: 'branch-2',
        isActive: undefined,
      });
    });

    it('passes isActive query param as boolean for "true" string', async () => {
      stationServiceMock.list.mockResolvedValue([]);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);

      await controller.list(mockUser, mockCtx, undefined, 'true');

      expect(stationServiceMock.list).toHaveBeenCalledWith({
        businessId: 'biz-1',
        branchId: undefined,
        isActive: true,
      });
    });

    it('passes isActive query param as boolean for "false" string', async () => {
      stationServiceMock.list.mockResolvedValue([]);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);

      await controller.list(mockUser, mockCtx, 'branch-1', 'false');

      expect(stationServiceMock.list).toHaveBeenCalledWith({
        businessId: 'biz-1',
        branchId: 'branch-1',
        isActive: false,
      });
    });

    it('passes through errors from PosStationsService', async () => {
      const error = new Error('Error al listar estaciones');
      stationServiceMock.list.mockRejectedValue(error);

      const controller = await buildControllerTest(PosStationsController, [
        { provide: PosStationsService, useValue: stationServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ]);

      await expect(controller.list(mockUser, mockCtx, undefined, undefined)).rejects.toThrow(error);
    });
  });
});
