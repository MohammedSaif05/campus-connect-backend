import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreateOdRequestDto {
  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}
