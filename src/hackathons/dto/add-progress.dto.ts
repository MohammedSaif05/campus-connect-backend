import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class AddProgressDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  date: string;
}
