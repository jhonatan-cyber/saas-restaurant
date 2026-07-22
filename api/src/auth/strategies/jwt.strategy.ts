import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload, AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Estrategia JWT para ACCESS tokens.
 * Lee el token de:
 *  1. Cookie `access_token` (HttpOnly — para navegadores web)
 *  2. Header `Authorization: Bearer <token>` (para mobile clients)
 *
 * Compatibilidad dual: web usa cookies, mobile clients siguen con Bearer.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    const cookieExtractor = (req: Request): string | null => {
      return req?.cookies?.['access_token'] ?? null;
    };

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    };

    super(options);
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Tipo de token inválido (se esperaba access)');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId,
      branchIds: payload.branchIds,
      defaultBranchId: null, // Se completa en runtime si se necesita
    };
  }
}
