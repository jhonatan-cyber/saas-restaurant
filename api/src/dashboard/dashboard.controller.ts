import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import type { AuthenticatedUser, BusinessContext as BusinessContextType } from '../auth/types/jwt-payload.type';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@UseGuards(ScopeGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Obtener métricas en tiempo real para el dashboard' })
  @ApiQuery({ name: 'branchId', required: false, type: String, description: 'Filtrar por sucursal' })
  async getMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboard.getMetrics({
      businessId: ctx?.businessId ?? user.businessId,
      branchId: branchId ?? ctx?.branchId ?? null,
    });
  }
}
