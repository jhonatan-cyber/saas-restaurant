import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import type { JwtPayload, AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Estrategia JWT para refresh tokens.
 * Misma firma que JwtStrategy, pero valida que el token sea de tipo "refresh".
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET no está configurado');
    }

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
