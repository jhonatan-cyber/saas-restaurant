import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import type { JwtPayload, AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Estrategia JWT para access tokens.
 * Valida la firma, expiración y que el token sea de tipo "access".
 * Lo que retorna `validate` se adjunta a `req.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
