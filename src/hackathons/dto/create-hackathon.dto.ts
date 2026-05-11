import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsInt, Min, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateHackathonDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isGroup: boolean;

  @ValidateIf(o => o.isGroup)
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  minSize?: number;

  @ValidateIf(o => o.isGroup)
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  maxSize?: number;

  @IsString()
  @IsNotEmpty()
  registrationDeadline: string; // ISO DateTime

  @IsString()
  @IsNotEmpty()
  hackathonDate: string; // ISO DateTime
}
