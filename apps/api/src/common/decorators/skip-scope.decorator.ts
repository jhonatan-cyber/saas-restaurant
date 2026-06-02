import { SetMetadata } from '@nestjs/common';

/**
 * Marcador (placeholder) para rutas que deben evadir el ScopeGuard.
 * Reservado para futuras rutas internas o del SuperAdmin global.
 * En Phase 2 no hay rutas con este comportamiento, pero dejamos
 * el decorador listo para no tocar la infra de guards en Phase 3+.
 */
export const SKIP_SCOPE_KEY = 'skipScope';
export const SkipScope = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_SCOPE_KEY, true);
