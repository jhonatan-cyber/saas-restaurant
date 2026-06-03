import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderChannel, OrderType } from '@saas/shared';

/**
 * Ítem dentro de un `CreateOrderDto`. El `productId` es la única referencia
 * viva al Product; el resto de los campos se SNAPSHOTTAN en el service
 * (R8). El `unitPrice` enviado por el cliente es IGNORADO: el backend
 * siempre recalcula desde el Product actual (guardrail #3).
 */
export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID del producto (cuid)' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 999 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Observación del ítem', example: 'sin sal' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'IGNORADO por el backend. Se acepta por compat con el frontend pero el server recalcula desde Product.',
  })
  @IsOptional()
  @Type(() => Number)
  unitPrice?: number;
}

/**
 * Body para crear una orden. La orden nace en estado PENDING.
 * El branchId se resuelve del ScopeGuard (header x-branch-id o JWT),
 * NUNCA del body.
 */
export class CreateOrderDto {
  @ApiPropertyOptional({ enum: OrderType, default: OrderType.DINE_IN })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @ApiPropertyOptional({ enum: OrderChannel, default: OrderChannel.POS_WEB })
  @IsOptional()
  @IsEnum(OrderChannel)
  channel?: OrderChannel;

  @ApiPropertyOptional({ description: 'ID de mesa (obligatorio para DINE_IN)' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({ description: 'ID de cliente (opcional, útil para factura)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'ID del mesero asignado' })
  @IsOptional()
  @IsString()
  waiterId?: string;

  @ApiPropertyOptional({ description: 'Notas globales de la orden', example: 'alergia a frutos secos' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  globalNotes?: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'Mínimo 1 ítem' })
  @IsArray()
  @ArrayMinSize(1, { message: 'La orden debe tener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
