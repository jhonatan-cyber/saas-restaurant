import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CsrfService } from '../services/csrf.service';

/**
 * CSRF protection guard using Double Submit Cookie pattern.
 *
 * Applied GLOBALLY in main.ts. Skips validation for:
 *  - Routes marked with @Public() (auth endpoints like login, refresh)
 *  - Safe HTTP methods: GET, HEAD, OPTIONS
 *  - Routes marked with @SkipCsrf()
 *
 * For mutating requests (POST, PUT, PATCH, DELETE):
 *  - Reads `csrf_token` cookie (non-HttpOnly, set by CsrfService)
 *  - Reads `X-CSRF-Token` header (set by frontend JS)
 *  - Compares both — they MUST match
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly csrfService = new CsrfService();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Safe methods: no CSRF check needed
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Rutas marcadas con @Public() también evaden CSRF
    // (login, refresh, register, etc. no necesitan CSRF)
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const csrfCookie = request.cookies?.['csrf_token'] as string | undefined;
    const csrfHeader = request.headers['x-csrf-token'];

    if (!this.csrfService.validateRequest(csrfCookie, csrfHeader)) {
      throw new ForbiddenException('CSRF token inválido o ausente');
    }

    return true;
  }
}
