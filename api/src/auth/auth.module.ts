import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCookiesService } from './services/auth-cookies.service';
import { CsrfService } from './services/csrf.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';

/**
 * AuthModule.
 * Registra Passport + JwtModule (con secretos desde env).
 * Exporta AuthService para que otros módulos (futuro) puedan emitir tokens.
 */
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // No fijamos secret global: cada estrategia usa el suyo.
        // Dejamos verifyOptions vacíos para evitar validación duplicada.
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthCookiesService, CsrfService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, AuthCookiesService, CsrfService, JwtModule],
})
export class AuthModule {}
