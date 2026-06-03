import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserFiltersDto } from './dto/users.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@saas/shared';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear usuario en el negocio' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.create(user, user.businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del negocio (paginado)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'status', required: false })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query() filters: UserFiltersDto,
  ) {
    return this.users.list(user.businessId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  getById(
    @Param('id') id: string,
  ) {
    return this.users.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar (borrado lógico) usuario' })
  remove(@Param('id') id: string) {
    return this.users.inactivate(id);
  }
}
