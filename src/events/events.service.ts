import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createEvent(
    user: JwtPayload,
    dto: CreateEventDto,
    file?: Express.Multer.File,
  ) {
    if (!user.departmentId) {
      throw new ForbiddenException('HOD must belong to a department');
    }

    let thumbnailUrl: string | null = null;

    const event = await this.prisma.event.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        collegeId: user.collegeId!,
        departmentId: user.departmentId!,
        createdById: user.userId,
      },
    });

    if (file) {
      const folderPath = `events/${user.collegeId}/${event.id}`;
      thumbnailUrl = await this.storage.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folderPath,
      );

      await this.prisma.event.update({
        where: { id: event.id },
        data: { thumbnailUrl },
      });
    }

    return { ...event, thumbnailUrl };
  }

  async findAll(user: JwtPayload) {
    // College-wide visibility, but fetch department details
    return this.prisma.event.findMany({
      where: {
        collegeId: user.collegeId!,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { name: true } },
      },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const event = await this.prisma.event.findUnique({
      where: { id, collegeId: user.collegeId! },
      include: {
        department: { select: { name: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async updateEvent(
    id: string,
    user: JwtPayload,
    dto: UpdateEventDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.event.findUnique({
      where: { id, collegeId: user.collegeId! },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    if (existing.createdById !== user.userId) {
      throw new ForbiddenException('You can only edit events you created');
    }

    let thumbnailUrl = existing.thumbnailUrl;

    if (file) {
      if (thumbnailUrl) {
        await this.storage.deleteFile(thumbnailUrl);
      }

      const folderPath = `events/${user.collegeId}/${id}`;
      thumbnailUrl = await this.storage.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folderPath,
      );
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        thumbnailUrl,
      },
    });
  }

  async deleteEvent(id: string, user: JwtPayload) {
    const existing = await this.prisma.event.findUnique({
      where: { id, collegeId: user.collegeId! },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    if (existing.createdById !== user.userId) {
      throw new ForbiddenException('You can only delete events you created');
    }

    if (existing.thumbnailUrl) {
      await this.storage.deleteFile(existing.thumbnailUrl);
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: 'Event deleted successfully' };
  }
}
