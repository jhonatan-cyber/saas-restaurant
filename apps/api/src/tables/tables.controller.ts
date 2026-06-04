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
import { TablesService } from './tables.service';
import type {
  CreateTableDto,
  UpdateTableDto,
  ChangeTableStatusDto,
  TableFiltersDto,
} from './dto/table.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

@ApiTags('tables')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mesas (paginado). Branch por defecto: main' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query() filters: TableFiltersDto,
  ) {
    return this.tables.list(user, context, filters);
  }

  @Get('all')
  @ApiOperation({ summary: 'Listado plano para floor plan (incluye posX/posY)' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  listAll(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query('branchId') branchId?: string,
  ) {
    return this.tables.listAll(user, context, branchId ? { branchId } : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una mesa' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ) {
    return this.tables.getById(user, context, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear mesa' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Body() dto: CreateTableDto,
  ) {
    return this.tables.create(user, context, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar mesa (no cambia status)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tables.update(user, context, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de la mesa (libre / ocupada / reservada)' })
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
    @Body() dto: ChangeTableStatusDto,
  ) {
    // Cualquier rol autenticado puede cambiar estado (mesero necesita esto).
    return this.tables.changeStatus(user, context, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ): Promise<void> {
    await this.tables.softDelete(user, context, id);
  }
}
