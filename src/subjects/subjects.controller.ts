import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SubjectsService } from './subjects.service.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { AssignSubjectDto } from './dto/assign-subject.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

@Controller('subjects')
@Roles(Role.STAFF, Role.HOD)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Roles(Role.STAFF)
  create(@Body() dto: CreateSubjectDto, @CurrentUser() user: JwtPayload) {
    return this.subjectsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
    return this.subjectsService.findAll(user, query);
  }

  @Post('assign')
  @Roles(Role.STAFF, Role.HOD)
  assign(@Body() dto: AssignSubjectDto, @CurrentUser() user: JwtPayload) {
    return this.subjectsService.assignToStaff(dto, user);
  }
}
