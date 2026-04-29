import { IsNotEmpty, IsString } from 'class-validator';

export class AssignSubjectDto {
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsNotEmpty()
  @IsString()
  batchId: string;

  @IsNotEmpty()
  @IsString()
  staffId: string;
}
