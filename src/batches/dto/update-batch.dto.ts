import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBatchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  startYear?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  endYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  currentSemester?: number;
}
