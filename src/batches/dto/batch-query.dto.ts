import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class BatchQueryDto extends PaginationQueryDto {
  /**
   * Search batches by name (case-insensitive, partial match)
   * Example: ?search=CSE
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filter by passed-out status. Defaults to false (active batches).
   * Pass ?isPassedOut=true to list passed-out batches.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : undefined)
  @IsBoolean()
  isPassedOut?: boolean;
}
