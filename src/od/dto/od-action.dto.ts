import { IsOptional, IsString } from 'class-validator';

export class OdActionDto {
  @IsOptional()
  @IsString()
  remark?: string;
}
