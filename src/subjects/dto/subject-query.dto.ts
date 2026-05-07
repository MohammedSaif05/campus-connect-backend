import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class SubjectQueryDto extends PaginationQueryDto {
  /**
   * Search by subject name or code (case-insensitive, partial match).
   * Example: ?search=data
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by semester number.
   * Example: ?semester=3
   */
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  semester?: number;
}
