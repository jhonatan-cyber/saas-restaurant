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
import { PreparationAreasService } from './preparation-areas.service';
import type {
  CreatePreparationAreaDto,
  UpdatePreparationAreaDto,
  ReorderPreparationAreasDto,
  PreparationAreaFiltersDto,
} from './dto/preparation-area.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

@ApiTags('preparation-areas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard)
@Controller('preparation-areas')
export class PreparationAreasController {
  constructor(private readonly areas: PreparationAreasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar áreas de preparación' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query() filters: PreparationAreaFiltersDto,
  ) {
    return this.areas.list(user, context, filters);
  }

  @Get('all')
  @ApiOperation({ summary: 'Listado plano de áreas activas' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  listAll(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query('isActive') isActive?: string,
    @Query('branchId') branchId?: string,
  ) {
    const parsedActive =
      isActive === undefined
        ? undefined
        : isActive === 'true'
          ? true
          : isActive === 'false'
            ? false
            : undefined;
    return this.areas.listAll(user, context, {
      ...(parsedActive !== undefined ? { isActive: parsedActive } : {}),
      ...(branchId ? { branchId } : {}),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ) {
    return this.areas.getById(user, context, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear área' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Body() dto: CreatePreparationAreaDto,
  ) {
    return this.areas.create(user, context, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar área' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
    @Body() dto: UpdatePreparationAreaDto,
  ) {
    return this.areas.update(user, context, id, dto);
  }

  @Patch('reorder')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reordenar áreas' })
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Body() dto: ReorderPreparationAreasDto,
  ) {
    return this.areas.reorder(user, context, dto.items);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar área (hard delete, falla si tiene productos)' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ): Promise<void> {
    await this.areas.hardDelete(user, context, id);
  }
}
