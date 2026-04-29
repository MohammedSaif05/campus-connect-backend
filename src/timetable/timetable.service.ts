import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, StaffBatchRoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTimetableDto } from './dto/create-timetable.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates or replaces the timetable for a batch.
   * Only the assigned tutor of the batch can do this.
   */
  async create(dto: CreateTimetableDto, currentUser: JwtPayload) {
    if (!currentUser.collegeId) {
      throw new ForbiddenException('User must belong to a college');
    }

    // Validate tutor is assigned to this batch
    if (currentUser.role !== Role.STAFF || !currentUser.isTutor) {
      throw new ForbiddenException('Only tutors can manage timetables');
    }

    const mapping = await this.prisma.staffBatchMapping.findFirst({
      where: {
        staffId: currentUser.userId,
        batchId: dto.batchId,
        roleType: StaffBatchRoleType.TUTOR,
      },
    });

    if (!mapping) {
      throw new ForbiddenException('You are not the tutor of this batch');
    }

    // Verify batch exists in the college
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, collegeId: currentUser.collegeId },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your college');
    }

    // Transaction: delete existing slots for this batch, then create new ones
    await this.prisma.$transaction([
      this.prisma.timetable.deleteMany({ where: { batchId: dto.batchId } }),
      this.prisma.timetable.createMany({
        data: dto.slots.map((slot) => ({
          batchId: dto.batchId,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          subjectId: slot.subjectId ?? null,
          staffId: slot.staffId ?? null,
        })),
      }),
    ]);

    return { message: 'Timetable updated successfully' };
  }

  /**
   * Gets the timetable for a batch, grouped by day.
   */
  async findByBatch(batchId: string, currentUser: JwtPayload) {
    if (!currentUser.collegeId) {
      throw new ForbiddenException('User must belong to a college');
    }

    // Verify batch belongs to user's college
    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, collegeId: currentUser.collegeId },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your college');
    }

    const slots = await this.prisma.timetable.findMany({
      where: { batchId },
      select: {
        id: true,
        day: true,
        startTime: true,
        endTime: true,
        type: true,
        subject: { select: { id: true, name: true, subjectCode: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    return { batchId, slots };
  }
}
