import { Body, Controller, Get, Param, Post, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaaSRolesGuard } from '../auth/guards/saas-roles.guard';
import { SaaSRoles } from '../auth/decorators/saas-roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SaaSRole } from '@saas/shared';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, SaaSRolesGuard)
@SaaSRoles(SaaSRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('auth/me')
  @ApiOperation({ summary: 'Devuelve el usuario SaaS autenticado (verificación de sesión)' })
  getMe(@CurrentUser() user: { sub: string; email: string; saasRole: string; userType: string }) {
    return {
      id: user.sub,
      email: user.email,
      role: user.saasRole,
    };
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Estadísticas globales del panel admin (solo SUPER_ADMIN)' })
  getDashboardStats() {
    return this.admin.getDashboardStats();
  }

  @Get('businesses')
  @ApiOperation({ summary: 'Listar todos los negocios (solo SUPER_ADMIN)' })
  listBusinesses(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('planCode') planCode?: string,
  ) {
    return this.admin.listBusinesses({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      search,
      status,
      dateFrom,
      dateTo,
      planCode,
    });
  }

  @Get('businesses/:id')
  @ApiOperation({ summary: 'Detalle de un negocio (solo SUPER_ADMIN)' })
  getBusinessDetail(@Param('id') id: string) {
    return this.admin.getBusinessDetail(id);
  }

  @Post('businesses/:id/assign-plan')
  @ApiOperation({ summary: 'Asignar plan a un negocio (solo SUPER_ADMIN)' })
  assignPlan(@Param('id') id: string, @Body() body: { planId: string }) {
    return this.admin.assignPlan(id, body.planId);
  }

  @Post('businesses/:id/cancel-subscription')
  @ApiOperation({ summary: 'Cancelar suscripción de un negocio (solo SUPER_ADMIN)' })
  cancelSubscription(@Param('id') id: string) {
    return this.admin.cancelSubscription(id);
  }

  @Patch('businesses/:id')
  @ApiOperation({ summary: 'Actualizar datos / suspender o activar un negocio' })
  updateBusiness(@Param('id') id: string, @Body() body: { name?: string; email?: string; status?: string }) {
    return this.admin.updateBusiness(id, body);
  }

  @Get('saas-users')
  @ApiOperation({ summary: 'Listar usuarios SaaS (solo SUPER_ADMIN)' })
  listSaaSUsers(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.admin.listSaaSUsers(Number(page) || 1, Number(pageSize) || 20);
  }

  @Post('saas-users')
  @ApiOperation({ summary: 'Crear usuario SaaS (solo SUPER_ADMIN)' })
  createSaaSUser(@Body() body: { email: string; password: string; role: string }) {
    return this.admin.createSaaSUser(body.email, body.password, body.role);
  }

  @Get('dashboard/series')
  @ApiOperation({ summary: 'Estadísticas mensuales (negocios, órdenes, ingresos)' })
  getDashboardSeries() {
    return this.admin.getDashboardSeries();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Log de auditoría global (cross-tenant, solo SUPER_ADMIN)' })
  listAuditLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
  ) {
    return this.admin.listAuditLogs(Number(page) || 1, Number(pageSize) || 50, { action, entity });
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar todas las suscripciones (solo SUPER_ADMIN)' })
  listSubscriptions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('planId') planId?: string,
  ) {
    return this.admin.listSubscriptions(Number(page) || 1, Number(pageSize) || 20, { status, planId });
  }
}
