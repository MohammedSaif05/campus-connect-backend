import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class StaffQueryDto extends PaginationQueryDto {
  /**
   * Search staff by name or email (case-insensitive, partial match)
   * Example: ?search=suresh
   */
  @IsOptional()
  @IsString()
  search?: string;
}
