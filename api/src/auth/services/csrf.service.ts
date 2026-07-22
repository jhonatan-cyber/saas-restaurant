import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

/**
 * CSRF token service using Double Submit Cookie pattern.
 *
 * Strategy:
 *  1. The API sets a non-HttpOnly cookie `csrf_token` with a random value.
 *  2. The frontend reads the cookie via JS and includes the value as `X-CSRF-Token` header.
 *  3. On mutating requests (POST/PUT/PATCH/DELETE), the API compares the header
 *     against the cookie value. They MUST match.
 *
 * This works because:
 *  - An attacker cannot read the cookie value from a different origin (SOP).
 *  - An attacker cannot set a custom header cross-origin (CORS preflight blocks it).
 *  - The cookie is not HttpOnly so JS can read it for the header.
 */
@Injectable()
export class CsrfService {
  /**
   * Generates a cryptographically random CSRF token.
   * 32 bytes → 64 hex chars.
   */
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Validates that the X-CSRF-Token header matches the csrf_token cookie.
   * Returns true if both are present and equal.
   */
  validateRequest(csrfCookie: string | undefined, csrfHeader: string | string[] | undefined): boolean {
    if (!csrfCookie || !csrfHeader) return false;
    const headerValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;
    return csrfCookie === headerValue;
  }
}
