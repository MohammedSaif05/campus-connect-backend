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

export class TimetableSlotDto {
  @IsNotEmpty()
  @IsEnum(Day)
  day: Day;

  @IsNotEmpty()
  @IsString()
  startTime: string;

  @IsNotEmpty()
  @IsString()
  endTime: string;

  @IsNotEmpty()
  @IsEnum(TimetableSlotType)
  type: TimetableSlotType;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;
}

export class CreateTimetableDto {
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
  @Type(() => TimetableSlotDto)
  slots: TimetableSlotDto[];
}
