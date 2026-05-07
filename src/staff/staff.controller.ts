import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { StaffService } from './staff.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { StaffQueryDto } from './dto/staff-query.dto.js';

@Controller('staff')
@Roles(Role.HOD)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Body() dto: CreateStaffDto, @CurrentUser() user: JwtPayload) {
    return this.staffService.create(dto, user);
  }

  @Get()
  @Roles(Role.HOD, Role.STAFF)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: StaffQueryDto) {
    return this.staffService.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.staffService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.update(id, dto, user);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.staffService.deactivate(id, user);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.staffService.activate(id, user);
  }
}
