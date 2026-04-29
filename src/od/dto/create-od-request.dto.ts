import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOdRequestDto {
  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}
