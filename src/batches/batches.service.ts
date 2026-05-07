import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, StaffBatchRoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { AssignTutorDto } from './dto/assign-tutor.dto.js';
import { BatchQueryDto } from './dto/batch-query.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBatchDto, currentUser: JwtPayload) {
    if (!currentUser.collegeId || !currentUser.departmentId) {
      throw new ForbiddenException('HOD must belong to a college and department');
    }

    if (dto.endYear <= dto.startYear) {
      throw new BadRequestException('End year must be after start year');
    }

    return this.prisma.batch.create({
      data: {
        name: dto.name,
        collegeId: currentUser.collegeId,
        departmentId: currentUser.departmentId,
        startYear: dto.startYear,
        endYear: dto.endYear,
        currentSemester: dto.currentSemester,
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
        startYear: true,
        endYear: true,
        currentSemester: true,
        tutorId: true,
      },
    });
  }

  async findAll(currentUser: JwtPayload, query: BatchQueryDto) {
    const where: any = {
      collegeId: currentUser.collegeId!,
      departmentId: currentUser.departmentId!,
      // Default to active batches; pass ?isPassedOut=true for passed-out batches
      isPassedOut: query.isPassedOut ?? false,
    };

    if (query.search?.trim()) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          name: true,
          startYear: true,
          endYear: true,
          currentSemester: true,
          isPassedOut: true,
          tutorId: true,
          tutor: { select: { id: true, name: true, email: true } },
          _count: { select: { students: true } },
        },
        orderBy: { startYear: 'desc' },
      }),
      this.prisma.batch.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }

  /**
   * Returns full details of a single batch including department, tutor,
   * student count, subject assignments, and staff-batch mappings.
   */
  async findOne(batchId: string, currentUser: JwtPayload) {
    const batch = await this.prisma.batch.findFirst({
      where: {
        id: batchId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
      },
      select: {
        id: true,
        name: true,
        startYear: true,
        endYear: true,
        currentSemester: true,
        isPassedOut: true,
        tutorId: true,
        // Tutor details
        tutor: {
          select: { id: true, name: true, email: true },
        },
        // Department details
        department: {
          select: { id: true, name: true },
        },
        // Student + subject counts
        _count: {
          select: { students: true, subjectAssignments: true },
        },
        // Subject assignments with subject info and teaching staff
        subjectAssignments: {
          select: {
            id: true,
            subject: { select: { id: true, name: true, subjectCode: true } },
            staff: { select: { id: true, name: true, email: true } },
          },
        },
        // Staff-batch mappings (all staff linked to this batch)
        staffBatchMappings: {
          select: {
            id: true,
            roleType: true,
            staff: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your department');
    }

    return batch;
  }

  /**
   * Lists active staff in the HOD's department who are NOT currently
   * assigned as tutor to any ACTIVE batch — available for tutor assignment.
   * Staff tutoring passed-out batches are considered free.
   */
  async availableTutors(currentUser: JwtPayload) {
    return this.prisma.user.findMany({
      where: {
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
        role: Role.STAFF,
        isActive: true,
        // Only exclude staff tutoring an active (non-passed-out) batch
        tutorBatches: { none: { isPassedOut: false } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        isTutor: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Assigns a tutor to a batch.
   * Validates that the staff is not already tutoring another batch.
   */
  async assignTutor(
    batchId: string,
    dto: AssignTutorDto,
    currentUser: JwtPayload,
  ) {
    // Verify batch belongs to HOD's department and college
    const batch = await this.prisma.batch.findFirst({
      where: {
        id: batchId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your department');
    }

    // Verify the staff exists, is active, and belongs to same college+department
    const staff = await this.prisma.user.findFirst({
      where: {
        id: dto.staffId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
        role: Role.STAFF,
        isActive: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found in your department');
    }

    // Ensure the staff is not already tutoring another batch
    const alreadyTutor = await this.prisma.batch.findFirst({
      where: {
        tutorId: dto.staffId,
        id: { not: batchId }, // Allow reassigning to the same batch
      },
    });

    if (alreadyTutor) {
      throw new BadRequestException(
        `${staff.name} is already assigned as tutor for another batch.`,
      );
    }

    // Use a transaction to ensure atomicity
    await this.prisma.$transaction([
      this.prisma.batch.update({
        where: { id: batchId },
        data: { tutorId: dto.staffId },
      }),
      this.prisma.user.update({
        where: { id: dto.staffId },
        data: { isTutor: true },
      }),
      this.prisma.staffBatchMapping.upsert({
        where: {
          staffId_batchId_roleType: {
            staffId: dto.staffId,
            batchId,
            roleType: StaffBatchRoleType.TUTOR,
          },
        },
        create: { staffId: dto.staffId, batchId, roleType: StaffBatchRoleType.TUTOR },
        update: {},
      }),
    ]);

    this.logger.log(`Tutor ${dto.staffId} assigned to batch ${batchId} by HOD ${currentUser.userId}`);
    return { message: 'Tutor assigned successfully' };
  }

  /**
   * Promotes a batch to the next semester (currentSemester + 1).
   * Maximum 8 semesters (4-year programme).
   */
  async promoteSemester(batchId: string, currentUser: JwtPayload) {
    const batch = await this.prisma.batch.findFirst({
      where: {
        id: batchId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your department');
    }

    const MAX_SEMESTER = (batch.endYear - batch.startYear) * 2;
    if (batch.currentSemester >= MAX_SEMESTER) {
      throw new BadRequestException(
        `Batch is already in its final semester (${MAX_SEMESTER}).`,
      );
    }

    const updated = await this.prisma.batch.update({
      where: { id: batchId },
      data: { currentSemester: { increment: 1 } },
      select: {
        id: true,
        name: true,
        currentSemester: true,
        startYear: true,
        endYear: true,
        tutorId: true,
        tutor: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Batch ${batchId} promoted to semester ${updated.currentSemester} by HOD ${currentUser.userId}`);
    return updated;
  }

  async update(id: string, dto: UpdateBatchDto, currentUser: JwtPayload) {
    const batch = await this.prisma.batch.findFirst({
      where: {
        id,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your department');
    }

    if (dto.startYear && dto.endYear && dto.endYear <= dto.startYear) {
      throw new BadRequestException('End year must be after start year');
    }

    return this.prisma.batch.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Marks a batch as passed out.
   * Frees the tutor (sets isTutor=false) if they are not tutoring any other active batch.
   */
  async markPassedOut(batchId: string, currentUser: JwtPayload) {
    const batch = await this.prisma.batch.findFirst({
      where: {
        id: batchId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your department');
    }

    if (batch.isPassedOut) {
      throw new BadRequestException('Batch is already marked as passed out.');
    }

    // Mark the batch as passed out
    await this.prisma.batch.update({
      where: { id: batchId },
      data: { isPassedOut: true },
    });

    // Free the tutor if they are not tutoring any other active (non-passed-out) batch
    if (batch.tutorId) {
      const otherActiveBatch = await this.prisma.batch.findFirst({
        where: {
          tutorId: batch.tutorId,
          id: { not: batchId },
          isPassedOut: false,
        },
      });

      if (!otherActiveBatch) {
        await this.prisma.user.update({
          where: { id: batch.tutorId },
          data: { isTutor: false },
        });
        this.logger.log(`Tutor ${batch.tutorId} freed after batch ${batchId} passed out`);
      }
    }

    this.logger.log(`Batch ${batchId} marked as passed out by HOD ${currentUser.userId}`);
    return { message: 'Batch marked as passed out successfully' };
  }
}
