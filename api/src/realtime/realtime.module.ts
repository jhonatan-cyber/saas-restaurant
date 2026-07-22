import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { WsAuthMiddleware } from './ws-auth.middleware';
import { WsThrottleMiddleware } from './ws-throttle.middleware';

/**
 * RealtimeModule: expone `RealtimeGateway` globalmente.
 *
 * - Global: cualquier módulo puede inyectar RealtimeGateway para emitir
 *   eventos sin tener que importarlo explícitamente.
 * - El middleware de auth se construye acá (necesita JwtService y Config)
 *   y se aplica al server en el `onModuleInit` del gateway.
 * - El middleware de rate-limit (`WsThrottleMiddleware`) limita conexiones
 *   por IP y eventos entrantes por socket.
 */
@Global()
@Module({
  imports: [ConfigModule, JwtModule.register({})],
  providers: [
    JwtService,
    {
      provide: WsAuthMiddleware,
      inject: [JwtService, ConfigService],
      useFactory: (jwt: JwtService, config: ConfigService) =>
        new WsAuthMiddleware(jwt, config),
    },
    {
      provide: WsThrottleMiddleware,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new WsThrottleMiddleware(config),
    },
    RealtimeGateway,
  ],
  exports: [RealtimeGateway, WsAuthMiddleware, WsThrottleMiddleware],
})
export class RealtimeModule {}
