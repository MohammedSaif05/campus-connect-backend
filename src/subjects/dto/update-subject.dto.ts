import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subjectCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  semester?: number;
}
