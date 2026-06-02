import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@saas/shared';

/**
 * Body para crear una categoría.
 * `branchId` opcional: si no viene, aplica a todo el business.
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nombre visible',
    example: 'Entradas',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Slug URL-friendly (auto-generable a partir de `name`)',
    example: 'entradas',
    maxLength: 80,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug inválido (solo minúsculas, números y guiones)' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Descripción opcional', example: 'Para abrir el apetito' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'URL de imagen' })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'URL inválida' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Si se omite, la categoría es global para el business',
    example: 'clxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Body para actualizar una categoría.
 * Todos los campos son opcionales.
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Item individual para reordenar.
 */
export class ReorderCategoryItemDto {
  @ApiProperty({ description: 'ID de la categoría' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Nuevo displayOrder', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({ type: [ReorderCategoryItemDto] })
  @Type(() => ReorderCategoryItemDto)
  items!: ReorderCategoryItemDto[];
}

/**
 * Filtros de listado.
 */
export class CategoryFiltersDto {
  @ApiPropertyOptional({ description: 'Filtrar por activas/inactivas' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre (contains, case-insensitive)' })
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
