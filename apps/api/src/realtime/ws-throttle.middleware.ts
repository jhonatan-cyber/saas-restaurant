import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { ERROR_CODES } from '@saas/shared';

/**
 * Configuración del rate limiter para WebSockets.
 */
interface WsThrottleConfig {
  /** Máximo de conexiones desde una misma IP en el tiempo de la ventana */
  maxConnectionsPerIp: number;
  /** Máximo de eventos entrantes por socket en el tiempo de la ventana */
  maxEventsPerSocket: number;
  /** Ventana de tiempo en ms */
  windowMs: number;
}

const DEFAULT_CONFIG: WsThrottleConfig = {
  maxConnectionsPerIp: 5,
  maxEventsPerSocket: 30,
  windowMs: 10_000, // 10 segundos
};

/**
 * Middleware de rate limiting para Socket.io.
 *
 * Dos niveles de protección:
 * 1. **Connection throttle**: Limita cuántas conexiones nuevas puede abrir
 *    una misma IP en una ventana de tiempo (ej. 5 conexiones cada 10s).
 * 2. **Event throttle**: Limita cuántos eventos entrantes puede enviar
 *    un socket en una ventana de tiempo (ej. 30 eventos cada 10s).
 *
 * Se aplica en el `afterInit` del gateway (como el WsAuthMiddleware)
 * para limitar conexiones, y también se expone un método `checkEvent`
 * para ser llamado en el catch-all `onAny` del socket.
 *
 * Las cuentas se almacenan en memoria (Map). Para un despliegue multi-
 * instancia, se podría migrar a Redis, pero para una sola instancia el
 * Map es suficiente y evita latencia adicional.
 */
export class WsThrottleMiddleware {
  private readonly logger = new Logger(WsThrottleMiddleware.name);
  private readonly config: WsThrottleConfig;

  // Mapa de IP → { contador, timestamp de reseteo }
  private readonly ipConnectionCounts = new Map<string, { count: number; resetAt: number }>();

  // Mapa de socketId → { contador, timestamp de reseteo }
  private readonly socketEventCounts = new Map<string, { count: number; resetAt: number }>();

  constructor(configService?: ConfigService) {
    if (configService) {
      this.config = {
        maxConnectionsPerIp: configService.get<number>('WS_MAX_CONNECTIONS_PER_IP', DEFAULT_CONFIG.maxConnectionsPerIp),
        maxEventsPerSocket: configService.get<number>('WS_MAX_EVENTS_PER_SOCKET', DEFAULT_CONFIG.maxEventsPerSocket),
        windowMs: configService.get<number>('WS_THROTTLE_WINDOW_MS', DEFAULT_CONFIG.windowMs),
      };
    } else {
      this.config = { ...DEFAULT_CONFIG };
    }

    this.logger.log(
      `🔒 WS throttle: ${this.config.maxConnectionsPerIp} conn/IP, ${this.config.maxEventsPerSocket} events/socket, ${this.config.windowMs}ms window`,
    );
  }

  /**
   * Middleware de conexión: verifica que la IP no exceda el límite.
   * Se usa como `io.use(middleware.handle)` en afterInit.
   */
  handle = (socket: Socket, next: (err?: Error) => void): void => {
    try {
      const ip = this.resolveIp(socket);

      // Limpiar entradas expiradas cada 100 conexiones (eventual, sin timer)
      if (this.ipConnectionCounts.size > 100) {
        this.evictExpired(this.ipConnectionCounts);
      }

      const now = Date.now();
      const entry = this.ipConnectionCounts.get(ip);

      if (!entry || now > entry.resetAt) {
        // Primera conexión o ventana expirada — resetear contador
        this.ipConnectionCounts.set(ip, { count: 1, resetAt: now + this.config.windowMs });
        next();
        return;
      }

      // Ventana aún activa
      if (entry.count >= this.config.maxConnectionsPerIp) {
        this.logger.warn(`🚫 IP ${ip} excedió límite de conexiones (${this.config.maxConnectionsPerIp}/${this.config.windowMs}ms)`);
        const err = new Error(`Demasiadas conexiones desde esta IP. Intentalo de nuevo en unos segundos.`);
        (err as any).code = ERROR_CODES.WS_RATE_LIMIT;
        next(err);
        return;
      }

      entry.count++;
      next();
    } catch (err) {
      this.logger.error(`Error en WS throttle: ${err}`);
      next(); // No bloquear conexión si falla el throttle
    }
  };

  /**
   * Verifica si un socket puede enviar un evento.
   * Se llama en el catch-all `socket.onAny()` del gateway.
   * Devuelve `true` si el evento está permitido, `false` si excede el límite.
   */
  checkEvent(socket: Socket, event: string): boolean {
    const now = Date.now();
    const entry = this.socketEventCounts.get(socket.id);

    if (!entry || now > entry.resetAt) {
      this.socketEventCounts.set(socket.id, { count: 1, resetAt: now + this.config.windowMs });
      return true;
    }

    if (entry.count >= this.config.maxEventsPerSocket) {
      this.logger.warn(
        `🚫 Socket ${socket.id} excedió límite de eventos (${this.config.maxEventsPerSocket}/${this.config.windowMs}ms) en evento "${event}"`,
      );
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Limpia las entradas de un socket específico al desconectarse.
   */
  removeSocket(socketId: string): void {
    this.socketEventCounts.delete(socketId);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private resolveIp(socket: Socket): string {
    // Intentar obtener IP de varias fuentes
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (forwarded) {
      const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return (value ?? '').split(',')[0]?.trim() ?? 'unknown';
    }
    return socket.handshake.address ?? 'unknown';
  }

  private evictExpired(map: Map<string, { count: number; resetAt: number }>): void {
    const now = Date.now();
    for (const [key, entry] of map) {
      if (now > entry.resetAt) {
        map.delete(key);
      }
    }
  }
}
