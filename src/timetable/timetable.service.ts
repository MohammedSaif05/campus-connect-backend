import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, StaffBatchRoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTimetableDto } from './dto/create-timetable.dto.js';
import { UpdateTimetableDto } from './dto/update-timetable.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates or replaces the timetable for a batch + semester.
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

    // Pre-fetch staff assignments for the subjects included in the timetable
    const subjectIds = dto.slots
      .filter((s) => s.type === 'SUBJECT' && s.subjectId)
      .map((s) => s.subjectId!);

    let assignments: Record<string, string> = {};
    if (subjectIds.length > 0) {
      const dbAssignments = await this.prisma.subjectAssignment.findMany({
        where: {
          batchId: dto.batchId,
          subjectId: { in: subjectIds },
        },
      });
      dbAssignments.forEach((a) => {
        assignments[a.subjectId] = a.staffId;
      });
    }

    // Transaction: delete existing slots for this batch and semester, then create new ones
    await this.prisma.$transaction([
      this.prisma.timetable.deleteMany({
        where: { batchId: dto.batchId, semester: dto.semester },
      }),
      this.prisma.timetable.createMany({
        data: dto.slots.map((slot) => {
          let resolvedStaffId = slot.staffId ?? null;
          
          if (slot.type === 'SUBJECT' && slot.subjectId && !resolvedStaffId) {
             resolvedStaffId = assignments[slot.subjectId] ?? null;
          }

          return {
            batchId: dto.batchId,
            semester: dto.semester,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.type,
            subjectId: slot.subjectId ?? null,
            staffId: resolvedStaffId,
          };
        }),
      }),
    ]);

    return { message: 'Timetable updated successfully' };
  }

  /**
   * Gets the timetable for a batch, filtered by semester.
   */
  async findByBatch(
    batchId: string,
    currentUser: JwtPayload,
    semester: number,
  ) {
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
      where: { batchId, semester },
      select: {
        id: true,
        semester: true,
        day: true,
        startTime: true,
        endTime: true,
        type: true,
        subject: { select: { id: true, name: true, subjectCode: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    return { batchId, semester, slots };
  }

  /**
   * Updates specific timetable slots for a batch + semester.
   * Only the assigned tutor of the batch can do this.
   */
  async update(dto: UpdateTimetableDto, currentUser: JwtPayload) {
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

    // Verify all slot IDs belong to this batch + semester
    const slotIds = dto.slots.map((s) => s.id);
    const existingSlots = await this.prisma.timetable.findMany({
      where: {
        id: { in: slotIds },
        batchId: dto.batchId,
        semester: dto.semester,
      },
    });

    if (existingSlots.length !== slotIds.length) {
      const foundIds = new Set(existingSlots.map((s) => s.id));
      const missingIds = slotIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Slot(s) not found in this batch/semester: ${missingIds.join(', ')}`,
      );
    }

    // Update each slot in a transaction
    await this.prisma.$transaction(
      dto.slots.map((slot) =>
        this.prisma.timetable.update({
          where: { id: slot.id },
          data: {
            ...(slot.day !== undefined && { day: slot.day }),
            ...(slot.startTime !== undefined && { startTime: slot.startTime }),
            ...(slot.endTime !== undefined && { endTime: slot.endTime }),
            ...(slot.type !== undefined && { type: slot.type }),
            ...(slot.subjectId !== undefined && { subjectId: slot.subjectId }),
            ...(slot.staffId !== undefined && { staffId: slot.staffId }),
          },
        }),
      ),
    );

    return { message: 'Timetable slots updated successfully' };
  }
}
