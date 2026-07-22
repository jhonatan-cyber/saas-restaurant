import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import type { CreateCheckoutDto } from './dto/billing.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@saas/shared';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('billing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly stripe: StripeService) {}

  @Post('checkout')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear sesión de pago Stripe Checkout para un plan' })
  async createCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.stripe.createCheckoutSession({
      businessId: user.businessId,
      planId: dto.planId,
      userId: user.id,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  @Post('portal')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear sesión del Portal de facturación de Stripe' })
  async createPortal(
    @CurrentUser() user: AuthenticatedUser,
    @Body('returnUrl') returnUrl?: string,
  ) {
    return this.stripe.createPortalSession(user.businessId, returnUrl);
  }
}
