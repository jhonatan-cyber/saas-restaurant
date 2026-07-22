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
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, productFiltersSchema, createProductSchema, updateProductSchema } from '@saas/shared';
import { ProductsService } from './products.service';
import type {
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.dto';
import type { ProductFiltersInput } from '@saas/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BusinessContext } from '../auth/decorators/business-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser, BusinessContext as Context } from '../auth/types/jwt-payload.type';

@ApiTags('products')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ScopeGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos (paginado, con filtros)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query(new ZodValidationPipe(productFiltersSchema)) filters: ProductFiltersInput,
  ) {
    return this.products.list(user, context, filters);
  }

  @Get('all')
  @ApiOperation({ summary: 'Listado paginado de productos disponibles (para POS)' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  listAll(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Query('categoryId') categoryId?: string,
    @Query('isAvailable') isAvailable?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedAvail =
      isAvailable === undefined
        ? undefined
        : isAvailable === 'true'
          ? true
          : isAvailable === 'false'
            ? false
            : undefined;
    return this.products.listAll(user, context, {
      ...(categoryId ? { categoryId } : {}),
      ...(parsedAvail !== undefined ? { isAvailable: parsedAvail } : {}),
      ...(page ? { page: Number(page) } : {}),
      ...(pageSize ? { pageSize: Number(pageSize) } : {}),
    });
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock bajo (Phase 6 lo conecta con inventario real)' })
  lowStock(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
  ) {
    return this.products.listLowStock(user, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un producto' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
  ) {
    return this.products.getById(user, context, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Crear producto' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
  ) {
    return this.products.create(user, context, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar producto (cambios de precio se auditan)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @BusinessContext() context: Context | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.products.update(user, context, id, dto);
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
    await this.products.softDelete(user, context, id);
  }
}
