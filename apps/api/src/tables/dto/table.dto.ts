import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, TableStatus, TableLocation } from '@saas/shared';

export class CreateTableDto {
  @ApiProperty({ description: 'Sucursal a la que pertenece la mesa' })
  @IsString()
  branchId!: string;

  @ApiProperty({ example: 'M1' })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  number!: string;

  @ApiPropertyOptional({ example: 4, default: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;

  @ApiPropertyOptional({ enum: TableLocation, default: TableLocation.INDOOR })
  @IsOptional()
  @IsEnum(TableLocation)
  location?: TableLocation;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Posición X en floor plan' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  posX?: number;

  @ApiPropertyOptional({ description: 'Posición Y en floor plan' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  posY?: number;
}

export class UpdateTableDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capacity?: number;

  @ApiPropertyOptional({ enum: TableLocation })
  @IsOptional()
  @IsEnum(TableLocation)
  location?: TableLocation;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  posX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  posY?: number;
}

export class ChangeTableStatusDto {
  @ApiProperty({ enum: TableStatus })
  @IsEnum(TableStatus)
  status!: TableStatus;

  @ApiPropertyOptional({ description: 'Motivo del cambio (libre, ocupado, reservado)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class TableFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: TableStatus })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiPropertyOptional({ enum: TableLocation })
  @IsOptional()
  @IsEnum(TableLocation)
  location?: TableLocation;

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
