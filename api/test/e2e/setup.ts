/**
 * E2E Test Setup
 *
 * Crea una instancia de la app NestJS con la configuración de test.
 * Se conecta a la BD real (saas_restaurant_test) y carga .env.test.
 *
 * Uso típico:
 *   let app: NestExpressApplication;
 *   beforeAll(async () => { app = await createApp(); });
 *   afterAll(async () => { await app.close(); });
 */
import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { request } from 'supertest';

/**
 * Crea la app NestJS para E2E testing.
 * - Lee .env.test automáticamente (via ConfigModule.forRoot con dotenv)
 * - Configura los mismos pipes/guards/filters que main.ts
 * - Expone `request(app.getHttpServer())` para supertest
 */
export async function createApp(): Promise<NestExpressApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  // Misma config que main.ts
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  await app.init();
  return app;
}

export { default as request } from 'supertest';
