import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { UpdateBusinessSettingsDto } from './dto/update-business.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@saas/shared';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';

@ApiTags('business')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('business')
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Obtener configuración del negocio + plan' })
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.business.getSettings(user.businessId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Actualizar configuración del negocio' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBusinessSettingsDto,
  ) {
    return this.business.updateSettings(user.businessId, dto);
  }
}
