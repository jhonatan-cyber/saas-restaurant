import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ERROR_CODES,
  WS_NAMESPACE,
  WS_ROOM_PATTERNS,
  WsConnectedPayload,
  WsOrderCancelledPayload,
  WsOrderCreatedPayload,
  WsOrderItemAddedPayload,
  WsOrderItemRemovedPayload,
  WsOrderItemUpdatedPayload,
  WsOrderStateChangedPayload,
  WsOrderUpdatedPayload,
  WS_EVENTS,
} from '@saas/shared';
import { Server, Socket } from 'socket.io';
import { WsAuthenticatedUser, WsAuthMiddleware } from './ws-auth.middleware';
import { WsThrottleMiddleware } from './ws-throttle.middleware';

/**
 * RealtimeGateway: servidor de WebSockets con namespace `/ws`.
 *
 * Responsabilidades:
 *  1. Autenticar el handshake con JWT (R2: WS auth + tenant scoping).
 *  2. Auto-join a rooms derivadas del payload:
 *     - `business:{businessId}:all`           — todos los usuarios del tenant.
 *     - `business:{businessId}:branch:{id}`   — para cada branchId en JWT.
 *     - (preparation areas: se unen dinámicamente en `joinPrepArea`).
 *  3. Exponer métodos tipados (`emitOrderCreated`, etc.) que OrdersService
 *     llama para notificar al frontend.
 *
 * Diseño: el gateway tiene AMBOS el decorador WebSocketGateway (para
 * manejar conexiones) Y métodos públicos de instancia (para emitir desde
 * otros servicios). Cualquier service que inyecte RealtimeGateway puede
 * emitir eventos tipados.
 */
@WebSocketGateway({
  namespace: WS_NAMESPACE,
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnModuleInit, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Set de preparation areas en las que cada socket está subscribed.
  // Permite limpieza en disconnect.
  private readonly socketPrepAreas = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly wsAuth: WsAuthMiddleware,
    private readonly wsThrottle: WsThrottleMiddleware,
  ) {}

  /**
   * Hook `afterInit` de NestJS: se ejecuta cuando el server de socket.io
   * está listo. Acá aplicamos el middleware de auth al `io` para que
   * TODA conexión pase por validación de JWT.
   */
  afterInit(server: Server): void {
    // Auth middleware (valida JWT en handshake)
    server.use((socket, next) => this.wsAuth.handle(socket, next));
    // Rate limiter middleware (limita conexiones por IP)
    server.use((socket, next) => this.wsThrottle.handle(socket, next));
    this.logger.log('🔌 WS auth + rate-limit middleware aplicados al namespace /ws');
  }

  onModuleInit(): void {
    // No-op: el server se inicializa después.
  }

  /**
   * Hook de conexión: verifica que el middleware haya autenticado y
   * auto-join a las rooms del tenant.
   */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const user = socket.data.user as WsAuthenticatedUser | undefined;
      if (!user) {
        this.logger.warn(`Socket ${socket.id} connected without auth data — rejecting`);
        socket.emit('connect_error', { code: ERROR_CODES.UNAUTHORIZED });
        socket.disconnect(true);
        return;
      }

      // Registrar catch-all para limitar eventos entrantes por socket
      socket.onAny((event: string) => {
        const allowed = this.wsThrottle.checkEvent(socket, event);
        if (!allowed) {
          socket.disconnect(true);
        }
      });

      // Auto-join a rooms de tenant y branch.
      const joinedRooms: string[] = [];
      const businessRoom = WS_ROOM_PATTERNS.business(user.businessId);
      socket.join(businessRoom);
      joinedRooms.push(businessRoom);

      for (const branchId of user.branchIds) {
        const branchRoom = WS_ROOM_PATTERNS.branch(user.businessId, branchId);
        socket.join(branchRoom);
        joinedRooms.push(branchRoom);
      }

      const connectedPayload: WsConnectedPayload = {
        userId: user.id,
        businessId: user.businessId,
        branchIds: user.branchIds,
        joinedRooms,
      };
      socket.emit(WS_EVENTS.CONNECTED, connectedPayload);

      this.logger.log(
        `Socket ${socket.id} connected: user=${user.email} rooms=[${joinedRooms.join(',')}]`,
      );
    } catch (err) {
      this.logger.error(`Error in handleConnection: ${err}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.socketPrepAreas.delete(socket.id);
    this.wsThrottle.removeSocket(socket.id);
    this.logger.debug(`Socket ${socket.id} disconnected`);
  }

  // =============================================================
  // API tipada para emitir eventos desde otros services.
  // Cada método hace `server.to(room).emit(EVENT, payload)`.
  // =============================================================

  private emitToRoom<T>(room: string, event: string, payload: T): void {
    if (!this.server) {
      this.logger.warn(`Server not ready, dropping event ${event}`);
      return;
    }
    this.server.to(room).emit(event, payload);
  }

  /** Notificar que se creó una orden. Room: branch del POS. */
  emitOrderCreated(businessId: string, branchId: string, payload: WsOrderCreatedPayload): void {
    this.emitToRoom(WS_ROOM_PATTERNS.branch(businessId, branchId), WS_EVENTS.ORDER_CREATED, payload);
  }

  /** Notificar actualización general de orden. */
  emitOrderUpdated(businessId: string, branchId: string, payload: WsOrderUpdatedPayload): void {
    this.emitToRoom(WS_ROOM_PATTERNS.branch(businessId, branchId), WS_EVENTS.ORDER_UPDATED, payload);
  }

  emitOrderItemAdded(
    businessId: string,
    branchId: string,
    payload: WsOrderItemAddedPayload,
  ): void {
    this.emitToRoom(WS_ROOM_PATTERNS.branch(businessId, branchId), WS_EVENTS.ORDER_ITEM_ADDED, payload);
  }

  emitOrderItemUpdated(
    businessId: string,
    branchId: string,
    payload: WsOrderItemUpdatedPayload,
  ): void {
    this.emitToRoom(WS_ROOM_PATTERNS.branch(businessId, branchId), WS_EVENTS.ORDER_ITEM_UPDATED, payload);
  }

  emitOrderItemRemoved(
    businessId: string,
    branchId: string,
    payload: WsOrderItemRemovedPayload,
  ): void {
    this.emitToRoom(WS_ROOM_PATTERNS.branch(businessId, branchId), WS_EVENTS.ORDER_ITEM_REMOVED, payload);
  }

  /**
   * Cambio de estado. Se emite a branch + todas las preparation areas
   * afectadas por los items de la orden.
   */
  emitOrderStateChanged(
    businessId: string,
    branchId: string,
    preparationAreaIds: string[],
    payload: WsOrderStateChangedPayload,
  ): void {
    this.emitToRoom(
      WS_ROOM_PATTERNS.branch(businessId, branchId),
      WS_EVENTS.ORDER_STATE_CHANGED,
      payload,
    );
    for (const areaId of preparationAreaIds) {
      this.emitToRoom(
        WS_ROOM_PATTERNS.prepArea(businessId, areaId),
        WS_EVENTS.ORDER_STATE_CHANGED,
        payload,
      );
    }
  }

  emitOrderCancelled(
    businessId: string,
    branchId: string,
    payload: WsOrderCancelledPayload,
  ): void {
    this.emitToRoom(
      WS_ROOM_PATTERNS.branch(businessId, branchId),
      WS_EVENTS.ORDER_CANCELLED,
      payload,
    );
  }
}
