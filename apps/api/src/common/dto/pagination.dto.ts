import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@saas/shared';

/**
 * DTO base para endpoints paginados.
 *  - page: 1-based
 *  - pageSize: tope configurable (default 20, max 100)
 *
 * Combinable con filtros específicos: extender con `PartialType` o
 * `IntersectionType` (no usamos @nestjs/mapped-types para evitar
 * agregar dependencia).
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Número de página (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser >= 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Tamaño de página',
    example: 20,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize debe ser un entero' })
  @Min(1, { message: 'pageSize debe ser >= 1' })
  @Max(MAX_PAGE_SIZE, { message: `pageSize no puede superar ${MAX_PAGE_SIZE}` })
  pageSize?: number = DEFAULT_PAGE_SIZE;
}

/**
 * Tipo de retorno de un endpoint paginado.
 *  - data: el array de elementos de la página actual.
 *  - meta: totales para construir la UI (paginadores, contadores).
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
