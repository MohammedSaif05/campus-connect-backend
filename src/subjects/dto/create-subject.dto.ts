import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  subjectCode: string;

  @IsNotEmpty()
  @IsString()
  departmentId: string;
}
