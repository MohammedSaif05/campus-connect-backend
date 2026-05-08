import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Day, TimetableSlotType } from '@prisma/client';

export class UpdateSlotDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsOptional()
  @IsEnum(Day)
  day?: Day;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsEnum(TimetableSlotType)
  type?: TimetableSlotType;

  @IsOptional()
  @IsString()
  subjectId?: string | null;

  @IsOptional()
  @IsString()
  staffId?: string | null;
}

export class UpdateTimetableDto {
  @IsNotEmpty()
  @IsString()
  batchId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  semester: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSlotDto)
  slots: UpdateSlotDto[];
}
