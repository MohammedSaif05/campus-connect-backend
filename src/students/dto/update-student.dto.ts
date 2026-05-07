import { IsOptional, IsString } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  registerNumber?: string;

  /** If provided, resets the user's password to this value (format: DDMMYYYY) and forces a password change on next login. */
  @IsOptional()
  @IsString()
  dob?: string;
}
