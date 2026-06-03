import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { AssignPlanDto } from './dto/subscription.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@saas/shared';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('subscription')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscription: SubscriptionService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obtener suscripción actual del negocio' })
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.subscription.getCurrent(user.businessId);
  }

  @Post('assign')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Asignar/cambiar plan del negocio' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignPlanDto,
  ) {
    return this.subscription.assign(user.businessId, dto.planId);
  }

  @Post('cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Cancelar suscripción (solo OWNER)' })
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subscription.cancel(user.businessId);
  }
}
