import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DepartmentsService } from './departments.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { CreateHodDto } from './dto/create-hod.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { GetDepartmentsQueryDto } from './dto/get-departments-query.dto.js';
import { UpdateHodDto } from './dto/update-hod.dto.js';

@Controller()
@Roles(Role.SUPER_ADMIN)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post('departments')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get('departments')
  findAll(@Query() query: GetDepartmentsQueryDto) {
    return this.departmentsService.findAll(query.collegeId, query);
  }

  @Patch('departments/:id')
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: import('./dto/update-department.dto.js').UpdateDepartmentDto,
  ) {
    return this.departmentsService.updateDepartment(id, dto);
  }

  @Post('hods')
  createHod(@Body() dto: CreateHodDto) {
    return this.departmentsService.createHod(dto);
  }

  @Patch('hods/:id')
  updateHod(
    @Param('id') id: string,
    @Body() dto: UpdateHodDto,
  ) {
    return this.departmentsService.updateHod(id, dto);
  }
}
