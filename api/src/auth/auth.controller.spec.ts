import { Test } from '@nestjs/testing';
import type { AuthenticatedUser } from './types/jwt-payload.type';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCookiesService } from './services/auth-cookies.service';
import { CsrfService } from './services/csrf.service';

// Mock del objeto Response de Express
function mockRes() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
}

describe('AuthController', () => {
  const authServiceMock = {
    login: jest.fn(),
    refresh: jest.fn(),
    buildAuthenticatedUserDto: jest.fn(),
  };

  const csrfServiceMock = {
    generateToken: jest.fn().mockReturnValue('test-csrf-token'),
    validateRequest: jest.fn(),
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

  it('forwards validated login payloads to AuthService and sets cookies', async () => {
    authServiceMock.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: CsrfService, useValue: csrfServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ],
    }).compile();

    const controller = moduleRef.get(AuthController);
    const input = {
      email: 'owner@demo.com',
      password: 'Owner123!',
      businessSlug: 'demo',
    };
    const res = mockRes() as any;

    const result = await controller.login(input, res);
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });
    expect(authServiceMock.login).toHaveBeenCalledWith(input);
    // Verificar que se setearon cookies
    expect(authCookiesMock.setAuthCookies).toHaveBeenCalledWith(res, 'access-token', 'refresh-token');
  });

  it('wraps refresh-token user data before delegating to AuthService', async () => {
    authServiceMock.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      expiresIn: 900,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: CsrfService, useValue: csrfServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ],
    }).compile();

    const controller = moduleRef.get(AuthController);
    const user: AuthenticatedUser = {
      id: 'user-1',
      email: 'owner@demo.com',
      role: 'OWNER' as AuthenticatedUser['role'],
      businessId: 'business-1',
      branchIds: ['branch-1'],
      defaultBranchId: null,
    };
    const res = mockRes() as any;

    const result = await controller.refresh(user, res);
    expect(result).toEqual({
      accessToken: 'new-access-token',
      expiresIn: 900,
    });
    expect(authServiceMock.refresh).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'owner@demo.com',
      businessId: 'business-1',
      role: 'OWNER',
      branchIds: ['branch-1'],
    });
  });

  it('delegates /me lookups to AuthService', async () => {
    authServiceMock.buildAuthenticatedUserDto.mockResolvedValue({ id: 'user-1' });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: CsrfService, useValue: csrfServiceMock },
        { provide: AuthCookiesService, useValue: authCookiesMock },
      ],
    }).compile();

    const controller = moduleRef.get(AuthController);

    await expect(controller.me({ id: 'user-1' } as never)).resolves.toEqual({
      id: 'user-1',
    });
    expect(authServiceMock.buildAuthenticatedUserDto).toHaveBeenCalledWith('user-1');
  });
});
