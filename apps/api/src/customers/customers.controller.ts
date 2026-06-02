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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@saas/shared';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  type CustomerFiltersDto,
} from './dto/customer.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes (paginado)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query() filters: CustomerFiltersDto,
  ) {
    return this.customers.list(user, context, filters);
  }

  @Get('search')
  @ApiOperation({ summary: 'Búsqueda liviana para autocomplete en POS' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(50, Math.max(1, Number(limit))) : 20;
    return this.customers.search(user, context, q ?? '', parsedLimit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un cliente' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ) {
    return this.customers.getById(user, context, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cliente (cualquier usuario autenticado)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(user, context, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user, context, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete (solo OWNER/ADMIN)' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ): Promise<void> {
    await this.customers.softDelete(user, context, id);
  }
}
