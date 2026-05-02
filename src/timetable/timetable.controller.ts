import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TimetableService } from './timetable.service.js';
import { CreateTimetableDto } from './dto/create-timetable.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  @Roles(Role.STAFF)
  create(@Body() dto: CreateTimetableDto, @CurrentUser() user: JwtPayload) {
    return this.timetableService.create(dto, user);
  }

  @Get(':batchId')
  findByBatch(
    @Param('batchId') batchId: string,
    @Query('semester') semester: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const semesterNum = semester ? parseInt(semester, 10) : undefined;
    return this.timetableService.findByBatch(batchId, user, semesterNum);
  }
}
