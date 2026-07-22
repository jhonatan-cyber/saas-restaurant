// no common imports needed — all mocks are jest.fn()
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { WsAuthMiddleware } from './ws-auth.middleware';
import { WsThrottleMiddleware } from './ws-throttle.middleware';
import { WS_ROOM_PATTERNS, WS_EVENTS, ERROR_CODES } from '@saas/shared';
import { OrderStatus } from '@prisma/client';
import type { Server, Socket } from 'socket.io';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let mockServer: jest.Mocked<Partial<Server>>;
  let mockSocket: jest.Mocked<Partial<Socket>>;
  let mockWsAuth: { handle: jest.Mock };
  let mockWsThrottle: { handle: jest.Mock; checkEvent: jest.Mock; removeSocket: jest.Mock };
  let mockJwtService: jest.Mocked<Partial<JwtService>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    role: 'ADMIN' as const,
    businessId: 'biz-1',
    branchIds: ['branch-1', 'branch-2'],
    defaultBranchId: null,
  };

  function createMockSocket(overrides: Partial<typeof mockSocket> = {}): typeof mockSocket {
    return {
      id: 'socket-1',
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      onAny: jest.fn(),
      data: { user: mockUser },
      ...overrides,
    } as unknown as typeof mockSocket;
  }

  beforeEach(async () => {
    mockJwtService = {} as any;
    mockConfigService = {} as any;
    mockWsAuth = { handle: jest.fn() };
    mockWsThrottle = {
      handle: jest.fn(),
      checkEvent: jest.fn().mockReturnValue(true),
      removeSocket: jest.fn(),
    };

    mockServer = {
      use: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WsAuthMiddleware, useValue: mockWsAuth },
        { provide: WsThrottleMiddleware, useValue: mockWsThrottle },
      ],
    }).compile();

    gateway = module.get(RealtimeGateway);
    // Assign the mock server
    (gateway as any).server = mockServer;
  });

  // ── afterInit ───────────────────────────────────────────────────────

  describe('afterInit', () => {
    it('registers two middleware (auth + throttle) via server.use()', () => {
      gateway.afterInit(mockServer as unknown as Server);

      expect(mockServer.use).toHaveBeenCalledTimes(2);
    });

    it('auth middleware delegates to wsAuth.handle', () => {
      gateway.afterInit(mockServer as unknown as Server);

      const authMw = (mockServer.use as jest.Mock).mock.calls[0][0];
      const mockNext = jest.fn();
      const mockSock = { id: 'test' };

      authMw(mockSock, mockNext);

      expect(mockWsAuth.handle).toHaveBeenCalledWith(mockSock, mockNext);
    });

    it('throttle middleware delegates to wsThrottle.handle', () => {
      gateway.afterInit(mockServer as unknown as Server);

      const throttleMw = (mockServer.use as jest.Mock).mock.calls[1][0];
      const mockNext = jest.fn();
      const mockSock = { id: 'test' };

      throttleMw(mockSock, mockNext);

      expect(mockWsThrottle.handle).toHaveBeenCalledWith(mockSock, mockNext);
    });
  });

  // ── handleConnection ───────────────────────────────────────────────

  describe('handleConnection', () => {
    it('joins business room and branch rooms on connect', async () => {
      mockSocket = createMockSocket();

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.join).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.business('biz-1'),
      );
      expect(mockSocket.join).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.branch('biz-1', 'branch-1'),
      );
      expect(mockSocket.join).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.branch('biz-1', 'branch-2'),
      );
      expect(mockSocket.join).toHaveBeenCalledTimes(3); // 1 business + 2 branches
    });

    it('emits CONNECTED event with payload', async () => {
      mockSocket = createMockSocket();

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        WS_EVENTS.CONNECTED,
        expect.objectContaining({
          userId: 'user-1',
          businessId: 'biz-1',
          branchIds: ['branch-1', 'branch-2'],
          joinedRooms: expect.arrayContaining([
            WS_ROOM_PATTERNS.business('biz-1'),
            WS_ROOM_PATTERNS.branch('biz-1', 'branch-1'),
          ]),
        }),
      );
    });

    it('rejects socket when no user in data (auth failed)', async () => {
      mockSocket = createMockSocket({ data: {} });

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('connect_error', {
        code: ERROR_CODES.UNAUTHORIZED,
      });
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('registers onAny catch-all for event throttling', async () => {
      mockSocket = createMockSocket();

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.onAny).toHaveBeenCalled();
    });

    it('registers onAny that disconnects socket if throttled', async () => {
      mockSocket = createMockSocket();
      mockWsThrottle.checkEvent.mockReturnValue(false);

      await gateway.handleConnection(mockSocket as unknown as Socket);

      // Get the onAny callback and invoke it
      const onAnyCb = (mockSocket.onAny as jest.Mock).mock.calls[0][0];
      onAnyCb('some-event');

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('handles errors gracefully by disconnecting', async () => {
      mockSocket = createMockSocket();
      mockSocket.join = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Should not throw — catches error and disconnects
      await expect(
        gateway.handleConnection(mockSocket as unknown as Socket),
      ).resolves.toBeUndefined();

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  // ── handleDisconnect ───────────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('cleans up prep area subscriptions and throttle state', () => {
      mockSocket = createMockSocket();
      // Simulate that the socket was subscribed to prep areas
      (gateway as any).socketPrepAreas.set('socket-1', new Set(['area-1', 'area-2']));

      gateway.handleDisconnect(mockSocket as unknown as Socket);

      expect((gateway as any).socketPrepAreas.has('socket-1')).toBe(false);
      expect(mockWsThrottle.removeSocket).toHaveBeenCalledWith('socket-1');
    });

    it('handles disconnect for socket without prep areas', () => {
      mockSocket = createMockSocket();

      gateway.handleDisconnect(mockSocket as unknown as Socket);

      expect(mockWsThrottle.removeSocket).toHaveBeenCalledWith('socket-1');
    });
  });

  // ── emitToRoom (private, tested via public methods) ─────────────────

  describe('emit methods (all delegate to emitToRoom)', () => {
    beforeEach(() => {
      mockServer.to = jest.fn().mockReturnValue(mockServer);
      mockServer.emit = jest.fn();
    });

    it('emitOrderCreated sends ORDER_CREATED to branch room', () => {
      const payload = { order: {} as any };
      gateway.emitOrderCreated('biz-1', 'branch-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.branch('biz-1', 'branch-1'),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.ORDER_CREATED,
        payload,
      );
    });

    it('emitOrderUpdated sends ORDER_UPDATED to branch room', () => {
      const payload = { order: {} as any };
      gateway.emitOrderUpdated('biz-1', 'branch-1', payload);

      expect(mockServer.to).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.branch('biz-1', 'branch-1'),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.ORDER_UPDATED,
        payload,
      );
    });

    it('emitOrderItemAdded sends ORDER_ITEM_ADDED to branch room', () => {
      const payload = { orderId: 'o-1', item: {} as any };
      gateway.emitOrderItemAdded('biz-1', 'branch-1', payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.ORDER_ITEM_ADDED,
        payload,
      );
    });

    it('emitOrderItemUpdated sends ORDER_ITEM_UPDATED to branch room', () => {
      const payload = { orderId: 'o-1', item: {} as any };
      gateway.emitOrderItemUpdated('biz-1', 'branch-1', payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.ORDER_ITEM_UPDATED,
        payload,
      );
    });

    it('emitOrderItemRemoved sends ORDER_ITEM_REMOVED to branch room', () => {
      const payload = { orderId: 'o-1', itemId: 'i-1' };
      gateway.emitOrderItemRemoved('biz-1', 'branch-1', payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.ORDER_ITEM_REMOVED,
        payload,
      );
    });

    it('emitOrderStateChanged sends to branch room AND each prep area room', () => {
      const payload = {
        orderId: 'o-1',
        from: OrderStatus.PENDING,
        to: OrderStatus.SENT_TO_KITCHEN,
        byUserId: 'user-1',
        at: new Date().toISOString(),
        reason: null,
      };

      gateway.emitOrderStateChanged('biz-1', 'branch-1', ['area-1', 'area-2'], payload);

      // Branch room
      expect(mockServer.to).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.branch('biz-1', 'branch-1'),
      );
      // Prep area rooms
      expect(mockServer.to).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.prepArea('biz-1', 'area-1'),
      );
      expect(mockServer.to).toHaveBeenCalledWith(
        WS_ROOM_PATTERNS.prepArea('biz-1', 'area-2'),
      );
      expect(mockServer.to).toHaveBeenCalledTimes(3);
      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.ORDER_STATE_CHANGED,
        payload,
      );
    });

    it('emitOrderCancelled sends ORDER_CANCELLED to branch room', () => {
      const payload = {
        orderId: 'o-1',
        cancelledByUserId: 'user-1',
        cancellationReason: 'test',
        at: new Date().toISOString(),
      };
      gateway.emitOrderCancelled('biz-1', 'branch-1', payload);

      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.ORDER_CANCELLED,
        payload,
      );
    });

    it('logs warning and does not emit when server is not initialized', () => {
      (gateway as any).server = null;
      const loggerWarn = jest.spyOn(gateway['logger'], 'warn').mockImplementation(() => {});

      gateway.emitOrderCreated('biz-1', 'branch-1', {} as any);

      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('Server not ready'),
      );
    });
  });
});
