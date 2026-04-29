import { IsNotEmpty, IsString } from 'class-validator';

export class AssignTutorDto {
  @IsNotEmpty()
  @IsString()
  staffId: string;
}
