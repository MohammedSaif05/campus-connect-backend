import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DepartmentsService } from './departments.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { CreateHodDto } from './dto/create-hod.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

@Controller()
@Roles(Role.SUPER_ADMIN)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post('departments')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get('departments')
  findAll(
    @Query('collegeId') collegeId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.departmentsService.findAll(collegeId, query);
  }

  @Post('hods')
  createHod(@Body() dto: CreateHodDto) {
    return this.departmentsService.createHod(dto);
  }
}
