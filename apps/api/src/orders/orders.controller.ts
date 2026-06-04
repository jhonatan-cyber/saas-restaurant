import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  OrderStatus,
  ERROR_CODES,
  HEADERS,
} from '@saas/shared';
import { OrdersService } from './orders.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { AddOrderItemDto, UpdateOrderItemDto } from './dto/order-item.dto';
import type { CancelOrderDto, TransitionOrderDto } from './dto/transition-order.dto';
import type { KdsFiltersDto, OrderFiltersDto } from './dto/order-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser, BusinessContext as BusinessContextType } from '../auth/types/jwt-payload.type';
import { allowedTransitions } from './order-state-machine';

/**
 * OrdersController: REST API del motor de pedidos.
 *
 * Convenciones:
 *  - Todas las rutas usan `@UseGuards(ScopeGuard)` (IDOR defense) +
 *    `@UseGuards(RolesGuard)` para escrituras.
 *  - El `branchId` siempre se resuelve del `BusinessContext` (header
 *    `x-branch-id` o defaultBranchId del JWT), NUNCA del body.
 *  - Para roles: lecturas permitidas a MESERO/CAJERO/COCINA/ADMIN/OWNER;
 *    escrituras (create/cancel/transición) a CAJERO/ADMIN/OWNER.
 */
@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(ScopeGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ============== KDS (ruta separada por claridad) ==============

  @Get('kds')
  @ApiOperation({ summary: 'Vista optimizada para KDS (Kitchen Display)' })
  async kds(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Query() filters: KdsFiltersDto,
  ) {
    return this.orders.kdsView(user, ctx, {
      branchId: filters.branchId,
      preparationAreaId: filters.preparationAreaId,
      states: filters.states && filters.states.length > 0 ? filters.states : undefined,
    });
  }

  // ============== LIST ==============

  @Get()
  @ApiOperation({ summary: 'Lista paginada de órdenes con filtros' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Query() filters: OrderFiltersDto,
  ) {
    return this.orders.list(user, ctx, filters);
  }

  // ============== GET BY ID ==============

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una orden con items y state logs' })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Param('id') id: string,
  ) {
    const order = await this.orders.getById(user, ctx, id);
    return {
      ...order,
      subtotal: order.subtotal.toString(),
      taxTotal: order.taxTotal.toString(),
      total: order.total.toString(),
      items: order.items.map((i) => ({
        ...i,
        unitPrice: i.unitPrice.toString(),
        taxRate: i.taxRate?.toString() ?? null,
        lineTotal: i.lineTotal.toString(),
        createdAt: i.createdAt.toISOString(),
      })),
      stateLogs: order.stateLogs.map((l) => ({
        ...l,
        metadata: l.metadata as Record<string, unknown> | null,
        createdAt: l.createdAt.toISOString(),
      })),
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  // ============== CREATE ==============

  @Post()
  @Roles('CAJERO', 'MESERO', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Crea una orden en estado PENDING' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.orders.create(user, ctx, dto);
    return {
      ...order,
      subtotal: order.subtotal.toString(),
      taxTotal: order.taxTotal.toString(),
      total: order.total.toString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
    };
  }

  // ============== ITEMS ==============

  @Post(':id/items')
  @Roles('CAJERO', 'MESERO', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Agrega un ítem a la orden (solo si PENDING)' })
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Param('id') id: string,
    @Body() dto: AddOrderItemDto,
  ) {
    const result = await this.orders.addItem(user, ctx, id, dto.productId, dto.quantity, dto.notes);
    return {
      order: this.serializeOrder(result.order),
      item: this.serializeItem(result.item),
    };
  }

  @Patch(':id/items/:itemId')
  @Roles('CAJERO', 'MESERO', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Edita qty/notes de un ítem (solo si PENDING)' })
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    const result = await this.orders.updateItem(user, ctx, id, itemId, dto);
    return {
      order: this.serializeOrder(result.order),
      item: this.serializeItem(result.item),
    };
  }

  @Delete(':id/items/:itemId')
  @Roles('CAJERO', 'MESERO', 'ADMIN', 'OWNER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quita un ítem de la orden (solo si PENDING)' })
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const order = await this.orders.removeItem(user, ctx, id, itemId);
    return this.serializeOrder(order);
  }

  // ============== STATE TRANSITIONS ==============

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @Roles('CAJERO', 'MESERO', 'COCINA', 'ADMIN', 'OWNER')
  @ApiOperation({
    summary: 'Transiciona el estado de la orden (validado por state machine)',
  })
  async transition(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Param('id') id: string,
    @Body() dto: TransitionOrderDto,
  ) {
    const order = await this.orders.transition(user, ctx, id, dto);
    return this.serializeOrder(order);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('CAJERO', 'MESERO', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Cancela la orden (requiere reason, registra userId)' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    const order = await this.orders.cancel(user, ctx, id, dto);
    return this.serializeOrder(order);
  }

  // ============== LOGS ==============

  @Get(':id/logs')
  @ApiOperation({ summary: 'Historial de transiciones de la orden' })
  async getLogs(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() ctx: BusinessContextType,
    @Param('id') id: string,
  ) {
    const logs = await this.orders.getLogs(user, ctx, id);
    return logs.map((l) => ({
      ...l,
      metadata: l.metadata as Record<string, unknown> | null,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  // ============== helpers de serialización ==============

  private serializeOrder(order: any) {
    return {
      ...order,
      subtotal: order.subtotal.toString(),
      taxTotal: order.taxTotal.toString(),
      total: order.total.toString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
    };
  }

  private serializeItem(item: any) {
    return {
      ...item,
      unitPrice: item.unitPrice.toString(),
      taxRate: item.taxRate?.toString() ?? null,
      lineTotal: item.lineTotal.toString(),
      createdAt: item.createdAt.toISOString(),
    };
  }
}
