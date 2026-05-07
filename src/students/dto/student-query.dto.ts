import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class StudentQueryDto extends PaginationQueryDto {
  /**
   * Filter by batch. Required for list endpoint.
   * Example: ?batchId=<uuid>
   */
  @IsOptional()
  @IsString()
  batchId?: string;

  /**
   * Search by name, email or register number (case-insensitive, partial match).
   * Example: ?search=saif
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by active status. Defaults to true (active students).
   * Pass ?isActive=false to list deactivated students.
   */
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  isActive?: boolean;
}
