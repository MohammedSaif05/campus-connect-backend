import { IsOptional, IsEnum } from 'class-validator';
import { OdStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class OdQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OdStatus)
  status?: OdStatus;
}
