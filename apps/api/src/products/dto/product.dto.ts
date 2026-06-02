import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ProductType } from '@saas/shared';

export class CreateProductDto {
  @ApiProperty({ example: 'Coca-Cola 500ml', maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'coca-cola-500ml' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug inválido' })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparationAreaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'SKU interno', example: 'BEB-001' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @ApiProperty({ example: 15.0, description: 'Precio de venta' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 6.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 13, description: 'Tasa de impuesto en %' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.SALE })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional({ example: 10, description: 'Minutos estimados de preparación' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  preparationTimeMin?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Disponible para la venta' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparationAreaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(600)
  preparationTimeMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class ProductFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
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
