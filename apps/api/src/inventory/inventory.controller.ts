import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { type InventoryFiltersDto } from './dto/inventory.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard)
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
}
