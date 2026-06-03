import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  OrderChannel,
  OrderStatus,
  OrderType,
} from '@saas/shared';

/**
 * Filtros para `GET /orders`. `status` acepta uno o varios (csv o repetido).
 */
export class OrderFiltersDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado. CSV o repetido: ?status=PENDING&status=READY',
    enum: OrderStatus,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : undefined))
  @IsArray()
  @ArrayUnique()
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];

  @ApiPropertyOptional({ enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @ApiPropertyOptional({ enum: OrderChannel })
  @IsOptional()
  @IsEnum(OrderChannel)
  channel?: OrderChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'ISO 8601, filtra createdAt >= dateFrom' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'ISO 8601, filtra createdAt <= dateTo' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: DEFAULT_PAGE_SIZE, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}

/**
 * Filtros para `GET /orders/kds`. Optimizado para la pantalla de cocina.
 */
export class KdsFiltersDto {
  @ApiPropertyOptional({ description: 'Sucursal (si no viene, usa el scope)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por área de preparación' })
  @IsOptional()
  @IsString()
  preparationAreaId?: string;

  @ApiPropertyOptional({
    description: 'Estados a mostrar (default: SENT_TO_KITCHEN, IN_PREPARATION)',
    enum: OrderStatus,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsArray()
  @ArrayUnique()
  @IsEnum(OrderStatus, { each: true })
  states?: OrderStatus[];
}
