import { Controller, Post, Get, Patch, Delete, Param, Body, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { EventsService } from './events.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.HOD)
  @UseInterceptors(FileInterceptor('thumbnail'))
  createEvent(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEventDto,
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
    return this.eventsService.createEvent(user, dto, file);
  }

  @Get()
  @Roles(Role.HOD, Role.STAFF, Role.STUDENT)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.eventsService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.HOD, Role.STAFF, Role.STUDENT)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.HOD)
  @UseInterceptors(FileInterceptor('thumbnail'))
  updateEvent(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEventDto,
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
    return this.eventsService.updateEvent(id, user, dto, file);
  }

  @Delete(':id')
  @Roles(Role.HOD)
  deleteEvent(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.eventsService.deleteEvent(id, user);
  }
}
