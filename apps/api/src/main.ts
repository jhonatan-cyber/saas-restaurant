import 'reflect-metadata';

import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
    cors: true,
  });

  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

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

  const port = Number(config.get<string>('API_PORT', '3001'));
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API corriendo en http://localhost:${port}/${globalPrefix}`);
  logger.log(`📚 Swagger en http://localhost:${port}/docs`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Error fatal al iniciar la API:', error);
  process.exit(1);
});
