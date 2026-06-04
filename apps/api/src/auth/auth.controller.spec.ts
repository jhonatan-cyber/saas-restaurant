import { Test } from '@nestjs/testing';
import type { AuthenticatedUser } from './types/jwt-payload.type';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authServiceMock = {
    login: jest.fn(),
    refresh: jest.fn(),
    buildAuthenticatedUserDto: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards validated login payloads to AuthService', async () => {
    authServiceMock.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    const controller = moduleRef.get(AuthController);
    const input = {
      email: 'owner@demo.com',
      password: 'Owner123!',
      businessSlug: 'demo',
    };

    await expect(controller.login(input)).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1' },
    });
    expect(authServiceMock.login).toHaveBeenCalledWith(input);
  });

  it('wraps refresh-token user data before delegating to AuthService', async () => {
    authServiceMock.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      expiresIn: 900,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
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

    await expect(controller.refresh(user)).resolves.toEqual({
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
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    const controller = moduleRef.get(AuthController);

    await expect(controller.me({ id: 'user-1' } as never)).resolves.toEqual({
      id: 'user-1',
    });
    expect(authServiceMock.buildAuthenticatedUserDto).toHaveBeenCalledWith('user-1');
  });
});
