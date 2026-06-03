import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Editar un ítem de orden. Solo se puede si la orden está en PENDING
 * (R3 / guardrail de state machine). No se puede cambiar productId ni
 * unitPrice (snapshot inmutable, R8).
 */
export class UpdateOrderItemDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Observación del ítem (null para limpiar)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

/**
 * Body para agregar un ítem nuevo a una orden existente.
 * Mismo shape que CreateOrderItemDto, expuesto aparte por claridad en Swagger.
 */
export class AddOrderItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
