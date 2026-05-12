import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  startDate: string; // ISO DateTime

  @IsString()
  @IsNotEmpty()
  endDate: string; // ISO DateTime
}
