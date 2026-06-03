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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto, PlanFiltersDto } from './dto/plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@saas/shared';

@ApiTags('plans')
@ApiBearerAuth('access-token')
@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear plan (solo SUPER_ADMIN)' })
  create(@Body() dto: CreatePlanDto) {
    return this.plans.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los planes (paginado)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  list(@Query() filters: PlanFiltersDto) {
    return this.plans.list(filters);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Listar planes públicos activos (sin auth)' })
  listPublic() {
    return this.plans.listPublic();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plan por ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  getById(@Param('id') id: string) {
    return this.plans.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar plan (solo SUPER_ADMIN)' })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Eliminar/desactivar plan (solo SUPER_ADMIN)' })
  remove(@Param('id') id: string) {
    return this.plans.remove(id);
  }
}
