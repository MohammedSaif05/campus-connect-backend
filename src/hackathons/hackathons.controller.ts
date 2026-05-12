import { Controller, Post, Get, Patch, Delete, Param, Body, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { HackathonsService } from './hackathons.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { CreateHackathonDto } from './dto/create-hackathon.dto.js';
import { UpdateHackathonDto } from './dto/update-hackathon.dto.js';
import { RegisterTeamDto } from './dto/register-team.dto.js';
import { AddProgressDto } from './dto/add-progress.dto.js';

@Controller('hackathons')
export class HackathonsController {
  constructor(private readonly hackathonsService: HackathonsService) {}

  @Post()
  @Roles(Role.HOD)
  @UseInterceptors(FileInterceptor('thumbnail'))
  createHackathon(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateHackathonDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.hackathonsService.createHackathon(user, dto, file);
  }

  @Get()
  @Roles(Role.HOD, Role.STAFF, Role.STUDENT)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.hackathonsService.findAll(user);
  }

  @Get('department-batches')
  @Roles(Role.STUDENT)
  getDepartmentBatches(@CurrentUser() user: JwtPayload) {
    return this.hackathonsService.getDepartmentBatches(user);
  }

  @Get('batches/:batchId/students')
  @Roles(Role.STUDENT)
  getBatchStudents(
    @Param('batchId') batchId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.hackathonsService.getBatchStudents(
      batchId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Get('student/my-teams')
  @Roles(Role.STUDENT)
  getMyTeams(@CurrentUser() user: JwtPayload) {
    return this.hackathonsService.getMyTeams(user);
  }

  @Get(':id')
  @Roles(Role.HOD, Role.STAFF, Role.STUDENT)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.hackathonsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.HOD)
  @UseInterceptors(FileInterceptor('thumbnail'))
  updateHackathon(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateHackathonDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.hackathonsService.updateHackathon(id, user, dto, file);
  }

  @Delete(':id')
  @Roles(Role.HOD)
  deleteHackathon(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.hackathonsService.deleteHackathon(id, user);
  }

  @Post(':id/register')
  @Roles(Role.STUDENT)
  registerTeam(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterTeamDto,
  ) {
    return this.hackathonsService.registerTeam(id, user, dto);
  }

  @Get(':id/teams')
  @Roles(Role.HOD, Role.STAFF)
  getTeams(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.hackathonsService.getHackathonTeams(id, user);
  }


  @Get('teams/:teamId')
  @Roles(Role.HOD, Role.STAFF, Role.STUDENT)
  getTeamDetails(@Param('teamId') teamId: string, @CurrentUser() user: JwtPayload) {
    return this.hackathonsService.getTeamDetails(teamId, user);
  }

  @Post('teams/:teamId/progress')
  @Roles(Role.STUDENT)
  addProgress(
    @Param('teamId') teamId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddProgressDto,
  ) {
    return this.hackathonsService.addProgress(teamId, user, dto);
  }
}
