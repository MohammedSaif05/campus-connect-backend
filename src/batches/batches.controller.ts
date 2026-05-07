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
import { BatchesService } from './batches.service.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { AssignTutorDto } from './dto/assign-tutor.dto.js';
import { BatchQueryDto } from './dto/batch-query.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Controller('batches')
@Roles(Role.HOD)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  create(@Body() dto: CreateBatchDto, @CurrentUser() user: JwtPayload) {
    return this.batchesService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: BatchQueryDto) {
    return this.batchesService.findAll(user, query);
  }

  @Get('available-tutors')
  availableTutors(@CurrentUser() user: JwtPayload) {
    return this.batchesService.availableTutors(user);
  }

  @Patch(':id/assign-tutor')
  assignTutor(
    @Param('id') id: string,
    @Body() dto: AssignTutorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.batchesService.assignTutor(id, dto, user);
  }

  @Patch(':id/promote')
  promoteSemester(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.batchesService.promoteSemester(id, user);
  }

  @Patch(':id/passout')
  markPassedOut(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.batchesService.markPassedOut(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.batchesService.update(id, dto, user);
  }
}
