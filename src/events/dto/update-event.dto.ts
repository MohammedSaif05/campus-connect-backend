import { IsString, IsOptional } from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startDate?: string; // ISO DateTime

  @IsOptional()
  @IsString()
  endDate?: string; // ISO DateTime
}
