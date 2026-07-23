import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@saas/shared';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';
import type { ReportFiltersDto, RequestReportDto } from './dto/report.dto';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar reportes generados (paginado)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reports.list(user, context, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un reporte' })
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ) {
    return this.reports.getById(user, context, id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Solicitar generación de un reporte' })
  request(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Body() dto: RequestReportDto,
  ) {
    return this.reports.request(user, context, dto);
  }
}
