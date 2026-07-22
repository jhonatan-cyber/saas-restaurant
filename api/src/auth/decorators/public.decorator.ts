import { SetMetadata } from '@nestjs/common';

/**
 * Marca una ruta como pública: el JwtAuthGuard global la deja pasar
 * sin validar el token.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
