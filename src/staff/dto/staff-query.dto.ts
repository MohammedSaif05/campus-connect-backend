import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class StaffQueryDto extends PaginationQueryDto {
  /**
   * Search staff by name or email (case-insensitive, partial match)
   * Example: ?search=suresh
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by active/inactive status. Defaults to true (active staff only).
   * Pass ?isActive=false to list deactivated staff.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'false' ? false : value === 'true' ? true : undefined)
  @IsBoolean()
  isActive?: boolean;
}
