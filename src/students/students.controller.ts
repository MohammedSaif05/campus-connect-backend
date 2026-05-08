import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StudentsService } from './students.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { StudentQueryDto } from './dto/student-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Controller('students')
@Roles(Role.STAFF, Role.HOD)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(Role.STAFF) // Only tutors (validated in service)
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.studentsService.create(dto, user);
  }

  @Get()
  @Roles(Role.STAFF, Role.HOD, Role.STUDENT)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: StudentQueryDto) {
    return this.studentsService.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.update(id, dto, user);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.deactivate(id, user);
  }
}
