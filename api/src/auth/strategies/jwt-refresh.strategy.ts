import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload, AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Estrategia JWT para REFRESH tokens.
 * Lee el token de:
 *  1. Cookie `refresh_token` (HttpOnly — para navegadores web)
 *  2. Header `Authorization: Bearer <token>` (para mobile clients)
 *
 * El refresh cookie tiene path derivado de API_GLOBAL_PREFIX (por defecto /api/auth/refresh)
 * solo se envía al endpoint de refresh, no a otras rutas.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET no está configurado');
    }

    const cookieExtractor = (req: Request): string | null => {
      return req?.cookies?.['refresh_token'] ?? null;
    };

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };

    super(options);
  }

  /**
   * Passport nos pasa `(req, payload)`. Devolvemos el payload validado.
   * El controller recibirá el `user` con la misma forma que JwtStrategy.
   */
  validate(_req: unknown, payload: JwtPayload): AuthenticatedUser {
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Tipo de token inválido (se esperaba refresh)');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId,
      branchIds: payload.branchIds,
      defaultBranchId: null,
    };
  }
}
