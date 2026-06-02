import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@saas/shared';

export class CreatePreparationAreaDto {
  @ApiProperty({ example: 'Cocina', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'KITCHEN', description: 'Código único, mayúsculas' })
  @IsString()
  @MaxLength(16)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Código inválido (solo mayúsculas, números, guion y guion bajo)',
  })
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePreparationAreaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(/^[A-Z0-9_-]+$/)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderPreparationAreaItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class ReorderPreparationAreasDto {
  @ApiProperty({ type: [ReorderPreparationAreaItemDto] })
  @Type(() => ReorderPreparationAreaItemDto)
  items!: ReorderPreparationAreaItemDto[];
}

export class PreparationAreaFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

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
