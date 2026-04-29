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
import { OdService } from './od.service.js';
import { CreateOdRequestDto } from './dto/create-od-request.dto.js';
import { OdActionDto } from './dto/od-action.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

@Controller('od-requests')
export class OdController {
  constructor(private readonly odService: OdService) {}

  @Post()
  @Roles(Role.STUDENT)
  create(
    @Body() dto: CreateOdRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.odService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.odService.findAll(user, query);
  }

  @Patch(':id/approve')
  @Roles(Role.STAFF, Role.HOD)
  approve(
    @Param('id') id: string,
    @Body() dto: OdActionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.odService.approve(id, dto, user);
  }

  @Patch(':id/reject')
  @Roles(Role.STAFF, Role.HOD)
  reject(
    @Param('id') id: string,
    @Body() dto: OdActionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.odService.reject(id, dto, user);
  }
}
