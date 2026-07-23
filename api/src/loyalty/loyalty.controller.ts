import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Role } from '@saas/shared';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

interface AuthedRequest extends Request {
  user?: AuthenticatedUser;
}

@Controller('loyalty')
@UseGuards(JwtAuthGuard, ScopeGuard)
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  /** GET /loyalty/program — Obtener configuración del programa */
  @Get('program')
  async getProgram(@Req() req: AuthedRequest) {
    const user = req.user!;
    return this.loyalty.getOrCreateProgram(user.businessId);
  }

  /** PUT /loyalty/program — Actualizar configuración del programa */
  @Put('program')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async updateProgram(
    @Req() req: AuthedRequest,
    @Body() dto: Record<string, unknown>,
  ) {
    const user = req.user!;
    return this.loyalty.updateProgram(user.businessId, dto as any);
  }

  /** GET /loyalty/customers/:customerId — Info de fidelización del cliente */
  @Get('customers/:customerId')
  async getCustomerLoyalty(
    @Req() req: AuthedRequest,
    @Param('customerId') customerId: string,
  ) {
    const user = req.user!;
    return this.loyalty.getCustomerLoyalty(user, undefined, customerId);
  }

  /** POST /loyalty/preview — Vista previa de canje de puntos */
  @Post('preview')
  async previewRedemption(
    @Req() req: AuthedRequest,
    @Body() dto: { customerId: string; points: number },
  ) {
    const user = req.user!;
    return this.loyalty.previewRedemption(user, dto.customerId, dto.points);
  }

  /** GET /loyalty/customers/:customerId/redemptions — Historial de canjes */
  @Get('customers/:customerId/redemptions')
  async getRedemptions(
    @Req() req: AuthedRequest,
    @Param('customerId') customerId: string,
  ) {
    const user = req.user!;
    return this.loyalty.getRedemptionHistory(user, customerId);
  }
}
