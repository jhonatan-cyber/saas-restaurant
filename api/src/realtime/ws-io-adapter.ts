import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ServerOptions } from 'socket.io';

/**
 * Custom IoAdapter que pasa la misma configuración CORS restringida a
 * Socket.IO que la que usa el HTTP layer.
 *
 * PROBLEMA:
 *  El IoAdapter por defecto (`new IoAdapter(app)`) NO pasa los orígenes
 *  permitidos a Socket.IO. El decorador `@WebSocketGateway({ cors })`
 *  aplica `origin: true` (permite TODO), lo cual rompe la seguridad.
 *
 * SOLUCIÓN:
 *  Este adaptador recibe los mismos orígenes que `app.enableCors()` y
 *  los pasa a Socket.IO, habilitando `credentials: true` para que las
 *  cookies HttpOnly (access_token, refresh_token, csrf_token) se envíen
 *  en el handshake del WebSocket.
 *
 * USO en main.ts:
 *  const origins = allowedOrigins.split(',').map(o => o.trim());
 *  app.useWebSocketAdapter(new WsIoAdapter(app, origins));
 */
export class WsIoAdapter extends IoAdapter {
  private readonly logger = new Logger(WsIoAdapter.name);

  constructor(
    app: NestExpressApplication,
    private readonly allowedOrigins: string[],
  ) {
    super(app);
    this.logger.log(
      `🔌 WsIoAdapter creado con orígenes: [${allowedOrigins.join(', ')}]`,
    );
  }

  /**
   * Crea el servidor Socket.IO con CORS explícito.
   * Usa los mismos orígenes que el HTTP CORS + credentials:true.
   */
  createIOServer(port: number, options?: ServerOptions): import('socket.io').Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization', 'Content-Type', 'x-csrf-token'],
      },
    });

    this.logger.log(
      `🔌 Socket.IO CORS configurado: origin=[${this.allowedOrigins.join(', ')}] credentials=true`,
    );

    return server;
  }
}
