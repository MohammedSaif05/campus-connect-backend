import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class GetDepartmentsQueryDto extends PaginationQueryDto {
  @IsNotEmpty()
  @IsString()
  collegeId: string;
}
