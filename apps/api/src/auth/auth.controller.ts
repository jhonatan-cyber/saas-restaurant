import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { loginSchema } from '@saas/shared';
import type { AuthenticatedUser } from './types/jwt-payload.type';
import type { LoginInput } from '@saas/shared';

/**
 * Controlador de autenticación.
 * Las rutas `@Public()` evaden el JwtAuthGuard global.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Body: { email, password, businessSlug }
   * Devuelve: { accessToken, refreshToken, user }
   */
  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login multi-tenant (requiere businessSlug)' })
  async login(@Body(new ZodValidationPipe(loginSchema)) input: LoginInput) {
    return this.authService.login(input);
  }

  /**
   * POST /auth/refresh
   * Header: Authorization: Bearer <refreshToken>
   * Devuelve: { accessToken, expiresIn }
   */
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresca el access token usando el refresh token' })
  async refresh(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.refresh({
      sub: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
      branchIds: user.branchIds,
    });
  }

  /**
   * GET /auth/me
   * Header: Authorization: Bearer <accessToken>
   * Devuelve: usuario autenticado con business + branches
   */
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Devuelve el usuario autenticado' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.buildAuthenticatedUserDto(user.id);
  }
}
