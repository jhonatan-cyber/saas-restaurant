import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsEnum, IsInt, Min as MinValidator } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body para ABRIR un turno de caja (D3=F4).
 * El usuario (cajero) debe estar autenticado y pertenecer al branch.
 */
export class OpenShiftDto {
  @IsString()
  @IsNotEmpty()
  cashRegisterId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El monto de apertura no puede ser negativo' })
  @Type(() => Number)
  openingAmount!: number;

  /**
   * BranchId del JWT (validado en service contra el cash register).
   * Alternativa: inferirlo del cash register, lo cual es más seguro.
   */
}

export class CloseShiftDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El monto de cierre no puede ser negativo' })
  @Type(() => Number)
  closingAmount!: number;

  @IsOptional()
  @IsString()
  closingNotes?: string;
}

export class CreateCashRegisterDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class CashFiltersDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED'])
  status?: 'OPEN' | 'CLOSED';

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @MinValidator(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @MinValidator(1)
  pageSize?: number;
}
