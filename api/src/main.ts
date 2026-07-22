import 'reflect-metadata';

import path from 'node:path';
import cookieParser from 'cookie-parser';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WsIoAdapter } from './realtime/ws-io-adapter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { HEADERS, parseEnv } from '@saas/shared';

// ── Validar env ANTES de que arranque la app ──────────────────────────
// Si falta una variable crítica, la app ni inicia con un error claro.
parseEnv(process.env);

/**
 * Bootstrap del API.
 * - Configura CORS, validación global, Swagger.
 * - Registra filtro global de excepciones e interceptor de logging.
 * - Aplica JwtAuthGuard como GUARD GLOBAL (con @Public() para opt-out).
 * - Registra IoAdapter para WebSockets (Phase 3). El middleware de auth
 *   de socket.io se aplica en `RealtimeGateway.afterInit()`.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // ── Cookie Parser (necesario para leer cookies HttpOnly) ────────────
  app.use(cookieParser());

  // ── CSRF Guard (Double Submit Cookie: solo mutating requests) ───────
  app.useGlobalGuards(new CsrfGuard(reflector));

  // ── Helmet (seguridad de headers HTTP) ──────────────────────────────
  // Helmet v8+ es ESM-only — usamos dynamic import para compatibilidad CJS
  const helmetModule = await import('helmet');
  app.use(helmetModule.default());

  // ── CORS restringido ────────────────────────────────────────────────
  const allowedOrigins = config.get<string>('CORS_ALLOWED_ORIGINS', 'http://localhost:3000');
  const origins = allowedOrigins.split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', HEADERS.BRANCH_ID, HEADERS.BUSINESS_ID, 'X-CSRF-Token'],
    exposedHeaders: [HEADERS.REQUEST_ID],
  });

  // Prefix global opcional
  const globalPrefix = config.get<string>('API_GLOBAL_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  // Validación global: whitelist elimina campos extra, transform tipa los DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtro + interceptor globales
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // JwtAuthGuard global: las rutas @Public() lo evaden.
  // El orden importa: JwtAuthGuard primero (autentica), CsrfGuard después (previene CSRF).
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // ============================================================
  //  Phase 3: WebSocket adapter con CORS restringido
  //  Usa WsIoAdapter que recibe los mismos orígenes que HTTP CORS,
  //  permitiendo que las cookies HttpOnly se envíen en el handshake.
  //  NOTE: engine.io has a Bun compat issue with server.listeners().
  //  Set DISABLE_WS=true in env to skip (e.g. Docker/Bun production).
  // ============================================================
  const disableWs = config.get<string>('DISABLE_WS', 'false') === 'true';
  if (!disableWs) {
    try {
      app.useWebSocketAdapter(new WsIoAdapter(app, origins));
      logger.log('🔌 WebSocket adapter registrado (CORS restringido)');
    } catch (err) {
      logger.warn(`⚠️ WebSocket adapter no disponible: ${err instanceof Error ? err.message : String(err)}`);
      logger.warn('   La API REST funciona normalmente. WebSocket se omitirá.');
    }
  } else {
    logger.warn('⚠️ WebSocket deshabilitado (DISABLE_WS=true)');
  }

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaaS Restaurant API')
    .setDescription('API multi-tenant para el sistema POS gastronómico')
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pega aquí tu access token',
      },
      'access-token',
    )
    .addApiKey({ type: 'apiKey', name: HEADERS.BRANCH_ID, in: 'header' }, 'branch-id')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Sirve archivos estáticos (uploads de reportes, imágenes, etc.)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  const port = Number(config.get<string>('API_PORT', '3001'));
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API corriendo en http://localhost:${port}/${globalPrefix}`);
  logger.log(`🔐 Cookies: access_token path=/, refresh_token path=/${globalPrefix}/auth/refresh, csrf_token path=/`);
  logger.log(`📚 Swagger en http://localhost:${port}/docs`);
  logger.log(`🔌 WebSocket en ws://localhost:${port}/ws (auth por JWT)`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Error fatal al iniciar la API:', error);
  process.exit(1);
});
