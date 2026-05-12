import { IsString, IsOptional } from 'class-validator';

export class UpdateHackathonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  registrationDeadline?: string; // ISO DateTime

  @IsOptional()
  @IsString()
  hackathonDate?: string; // ISO DateTime
}
