import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { type InventoryFiltersDto, type AdjustInventoryDto } from './dto/inventory.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { adjustInventorySchema } from '@saas/shared';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('movements')
  @ApiOperation({ summary: 'Listar movimientos de inventario (paginado)' })
  listMovements(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query() filters: InventoryFiltersDto,
  ) {
    return this.inventory.listMovements(user, context, filters);
  }

  @Get('kardex/:productId')
  @ApiOperation({ summary: 'Kardex de un producto (movimientos ordenados)' })
  @ApiQuery({ name: 'branchId', required: false })
  getKardex(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('productId') productId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.inventory.getKardex(user, context, productId, branchId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock bajo' })
  getLowStock(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query('branchId') branchId?: string,
  ) {
    return this.inventory.getLowStock(user, context, { branchId });
  }

  @Post('adjust')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Ajuste manual de inventario (entrada/salida)' })
  adjust(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Body(new ZodValidationPipe(adjustInventorySchema)) dto: AdjustInventoryDto,
  ) {
    return this.inventory.adjustStock(user, context, dto);
  }
}
