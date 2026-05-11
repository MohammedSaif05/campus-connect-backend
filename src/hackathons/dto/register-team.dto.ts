import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class RegisterTeamDto {
  @IsString()
  @IsOptional()
  teamName?: string;

  @IsString()
  @IsNotEmpty()
  ideaTitle: string;

  @IsString()
  @IsNotEmpty()
  ideaDescription: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberIds?: string[];
}
