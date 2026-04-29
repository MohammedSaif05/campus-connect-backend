import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @IsNotEmpty()
  @IsString()
  collegeId: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}
