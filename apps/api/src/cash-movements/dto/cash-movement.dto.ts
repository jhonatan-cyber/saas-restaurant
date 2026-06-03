import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsOptional, MaxLength, IsInt, Min as MinV } from 'class-validator';
import { Type } from 'class-transformer';

export const CASH_MOVEMENT_TYPES = ['CASH_IN', 'CASH_OUT'] as const;
export type CashMovementTypeInput = (typeof CASH_MOVEMENT_TYPES)[number];

export const CASH_MOVEMENT_CATEGORIES = [
  'OWNER_INVESTMENT',
  'SUPPLIER_REFUND',
  'LOAN_RECEIVED',
  'TIP',
  'OTHER_IN',
  'SUPPLIES',
  'MAINTENANCE',
  'SALARY_ADVANCE',
  'RENT',
  'UTILITIES',
  'OWNER_WITHDRAWAL',
  'OTHER_OUT',
] as const;
export type CashMovementCategoryInput = (typeof CASH_MOVEMENT_CATEGORIES)[number];

export class CreateCashMovementDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsEnum(CASH_MOVEMENT_TYPES)
  type!: CashMovementTypeInput;

  @IsEnum(CASH_MOVEMENT_CATEGORIES)
  category!: CashMovementCategoryInput;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CashMovementFiltersDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsEnum(CASH_MOVEMENT_TYPES)
  type?: CashMovementTypeInput;

  @IsOptional()
  @IsEnum(CASH_MOVEMENT_CATEGORIES)
  category?: CashMovementCategoryInput;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @MinV(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @MinV(1)
  pageSize?: number;
}
