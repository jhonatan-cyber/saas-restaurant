import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@saas/shared';

export interface PaginationDto {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
