import { PaginationQueryDto } from '../dto/pagination-query.dto.js';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Converts page/limit into Prisma-compatible skip/take values.
 */
export function getPrismaPageParams(query: PaginationQueryDto) {
  return {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  };
}

/**
 * Wraps data and count into the standard paginated response format.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
    },
  };
}
