import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsOptional, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export const PAYMENT_METHODS = ['CASH', 'QR', 'TRANSFER', 'CARD'] as const;
export type PaymentMethodInput = (typeof PAYMENT_METHODS)[number];

/**
 * Un pago individual. CASH requiere tendered; QR/TRANSFER/CARD requieren reference.
 */
export class PaymentItemDto {
  @IsEnum(PAYMENT_METHODS)
  method!: PaymentMethodInput;

  /**
   * Monto NETO que se acredita a la orden.
   * Para CASH = amount + change (tendered = amount + change).
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  tendered?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  change?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;
}

export class CreatePaymentsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe incluir al menos un pago' })
  @ArrayMaxSize(10, { message: 'Máximo 10 pagos por orden' })
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments!: PaymentItemDto[];
}

export class PreviewChangeDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  tendered!: number;
}
