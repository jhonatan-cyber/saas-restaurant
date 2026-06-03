import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@saas/shared';
import { PosStationsService } from './pos-stations.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

/**
 * Endpoints de estaciones POS (FASE 5).
 *
 * activate (POST /activate) — público, usa businessSlug (sin auth).
 * generate (POST /generate) — OWNER/ADMIN, crea código de activación.
 * list    (GET /)          — OWNER/ADMIN, lista estaciones.
 */
@Controller('pos-stations')
export class PosStationsController {
  constructor(private readonly service: PosStationsService) {}

  /* ───────── Activar estación desde el desktop ───────── */
  @Post('activate')
  async activate(@Body() dto: {
    businessSlug: string;
    stationCode: string;
    deviceName?: string;
  }) {
    return this.service.activate(dto);
  }

  /* ───────── Generar código de estación (OWNER/ADMIN) ───────── */
  @Post('generate')
  @UseGuards(JwtAuthGuard, ScopeGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: Context | undefined,
    @Body() dto: { branchId: string; name?: string },
  ) {
    return this.service.generate({
      businessId: user.businessId,
      branchId: dto.branchId,
      name: dto.name ?? null,
    });
  }

  /* ───────── Listar estaciones (OWNER/ADMIN) ───────── */
  @Get()
  @UseGuards(JwtAuthGuard, ScopeGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: Context | undefined,
    @Query('branchId') branchId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.list({
      businessId: user.businessId,
      branchId: branchId || undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }
}
