import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TimetableService } from './timetable.service.js';
import { CreateTimetableDto } from './dto/create-timetable.dto.js';
import { UpdateTimetableDto } from './dto/update-timetable.dto.js';
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
    @Query('semester', ParseIntPipe) semester: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.timetableService.findByBatch(batchId, user, semester);
  }

  @Patch()
  @Roles(Role.STAFF)
  update(@Body() dto: UpdateTimetableDto, @CurrentUser() user: JwtPayload) {
    return this.timetableService.update(dto, user);
  }
}
