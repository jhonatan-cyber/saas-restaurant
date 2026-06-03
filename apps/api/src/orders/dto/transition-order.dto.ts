import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { OrderStatus } from '@saas/shared';

/**
 * Body para transicionar el estado de una orden.
 * El service valida la matriz `canTransition` antes de aplicar.
 *
 * NO se acepta `from`: el server deduce el estado actual desde BD.
 * NO se acepta DRAFT ni CANCELLED acá: DRAFT no se usa, y CANCELLED
 * tiene su propio endpoint con razón obligatoria.
 */
export class TransitionOrderDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  to!: OrderStatus;

  @ApiPropertyOptional({ description: 'Motivo opcional (visible en OrderStateLog)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Versión que vio el cliente (optimistic lock, R4)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}

/**
 * Body para cancelar una orden. `reason` es OBLIGATORIO (R6).
 */
export class CancelOrderDto {
  @ApiProperty({ description: 'Razón de cancelación (mín 5 caracteres)', minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'La razón debe tener al menos 5 caracteres' })
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ description: 'Versión que vio el cliente (optimistic lock)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}
