import 'reflect-metadata';

import path from 'node:path';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { HEADERS } from '@saas/shared';

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
  });

  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

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
    allowedHeaders: ['Content-Type', 'Authorization', HEADERS.BRANCH_ID],
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

  // JwtAuthGuard global: las rutas @Public() lo evaden
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // ============================================================
  //  Phase 3: WebSocket adapter (auth aplicada en RealtimeGateway)
  // ============================================================
  app.useWebSocketAdapter(new IoAdapter(app));

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
  logger.log(`📚 Swagger en http://localhost:${port}/docs`);
  logger.log(`🔌 WebSocket en ws://localhost:${port}/ws (auth por JWT)`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Error fatal al iniciar la API:', error);
  process.exit(1);
});
