import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, BranchStatus } from '@saas/shared';

/**
 * Body para crear una sucursal.
 * `code` debe ser único por business.
 */
export class CreateBranchDto {
  @ApiProperty({
    description: 'Nombre de la sucursal',
    example: 'Sucursal Central',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Código único por business (ej: CEN, SUC-01)',
    example: 'CEN',
    maxLength: 20,
  })
  @IsString()
  @MinLength(1, { message: 'El código es obligatorio' })
  @MaxLength(20)
  code!: string;

  @ApiPropertyOptional({ description: 'Dirección de la sucursal', example: 'Av. Principal #123' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '+591 71234567' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ description: 'Sucursal principal', default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

/**
 * Body para actualizar una sucursal.
 */
export class UpdateBranchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ApiPropertyOptional({ enum: BranchStatus })
  @IsOptional()
  @IsEnum(BranchStatus)
  status?: BranchStatus;
}

/**
 * Filtros de listado.
 */
export class BranchFiltersDto {
  @ApiPropertyOptional({ description: 'Filtrar por activas/inactivas' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre (contains)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

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
