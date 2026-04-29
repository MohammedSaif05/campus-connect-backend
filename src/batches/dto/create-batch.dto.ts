import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateBatchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  @Min(2000)
  startYear: number;

  @IsNotEmpty()
  @IsInt()
  @Min(2000)
  endYear: number;
}
