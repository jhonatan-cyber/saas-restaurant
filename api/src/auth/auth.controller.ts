import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthCookiesService } from './services/auth-cookies.service';
import { CsrfService } from './services/csrf.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { loginSchema } from '@saas/shared';
import type { AuthenticatedUser } from './types/jwt-payload.type';
import type { LoginInput } from '@saas/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
    private readonly authCookies: AuthCookiesService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login unificado (businessSlug opcional). Sin slug → SaaS admin, con slug → restaurant.' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(input);
    this.authCookies.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresca access token (cookie o Bearer)' })
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh({
      sub: user.id,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
      branchIds: user.branchIds,
    });
    this.authCookies.setAccessCookie(res, result.accessToken);
    return result;
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Devuelve el usuario autenticado' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.buildAuthenticatedUserDto(user.id);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierra sesión (limpia cookies)' })
  async logout(@Res({ passthrough: true }) res: Response) {
    this.authCookies.clearAuthCookies(res);
    return { message: 'Sesión cerrada exitosamente' };
  }

  @Public()
  @Get('setup-status')
  @ApiOperation({ summary: 'Verificar si el sistema necesita configuración inicial' })
  getSetupStatus() {
    return this.authService.getSetupStatus();
  }

  @Public()
  @Post('setup')
  @ApiOperation({ summary: 'Crear primer SUPER_ADMIN (solo si no hay usuarios)' })
  async setup(@Body() body: { email: string; password: string }) {
    return this.authService.setup(body.email, body.password);
  }

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Obtiene token CSRF' })
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const token = this.csrfService.generateToken();
    this.authCookies.setCsrfCookie(res, token);
    return { csrfToken: token };
  }

  @Public()
  @Get('check-business/:slug')
  @ApiOperation({ summary: 'Verifica si un slug de negocio existe (público)' })
  async checkBusiness(@Param('slug') slug: string) {
    return this.authService.checkBusiness(slug);
  }

}
