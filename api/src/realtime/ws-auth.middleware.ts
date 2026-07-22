import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES, JwtPayload, Role } from '@saas/shared';
import { Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';

/**
 * Forma de `socket.data.user` después de la autenticación WS.
 * Es la misma `AuthenticatedUser` que en REST pero pensada para sockets.
 */
export interface WsAuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  businessId: string;
  branchIds: string[];
  defaultBranchId: string | null;
}

/**
 * Middleware de socket.io que autentica el handshake.
 * - Lee el JWT de `socket.handshake.auth.token` (Bearer).
 * - Valida firma, expiración y `typ === 'access'`.
 * - Popula `socket.data.user` para uso en gateway.
 * - Si falla, desconecta con `connect_error` y código `unauthorized`.
 *
 * Se aplica globalmente a TODO namespace del gateway. No hay forma de
 * bypassear: si el cliente no trae token, no conecta.
 */
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Express-style middleware. Socket.io v4 llama a esto antes del evento
   * `connection` (cuando se usa `io.use(middleware)`).
   *
   * Si lanza, la conexión se rechaza y el cliente recibe `connect_error`.
   */
  handle = (socket: Socket, next: (err?: Error) => void): void => {
    try {
      const rawToken =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') ?? null);

      if (!rawToken) {
        throw new UnauthorizedException({
          message: 'Missing auth.token in handshake',
          code: ERROR_CODES.UNAUTHORIZED,
        });
      }

      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload = this.jwtService.verify<JwtPayload>(rawToken, { secret });

      if (payload.typ !== 'access') {
        throw new UnauthorizedException({
          message: 'Invalid token type (expected access)',
          code: ERROR_CODES.UNAUTHORIZED,
        });
      }

      // Adjuntamos el usuario al socket. El gateway lo lee desde
      // `socket.data.user` para auto-join a rooms.
      const user: WsAuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        businessId: payload.businessId,
        branchIds: payload.branchIds,
        defaultBranchId: null, // se completa en REST si se necesita
      };
      socket.data.user = user;

      this.logger.log(
        `WS auth ok: userId=${user.id} business=${user.businessId} branches=[${user.branchIds.join(',')}]`,
      );

      next();
    } catch (err) {
      this.logger.warn(
        `WS auth failed for socket ${socket.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      next(err as Error);
    }
  };
}
