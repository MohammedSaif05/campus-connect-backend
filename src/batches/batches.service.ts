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
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
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

  async findAll(currentUser: JwtPayload, query: PaginationQueryDto) {
    const where = {
      collegeId: currentUser.collegeId!,
      departmentId: currentUser.departmentId!,
    };

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
   * Assigns a tutor to a batch.
   * Sets is_tutor=true on the user and creates a StaffBatchMapping.
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

    // Use a transaction to ensure atomicity
    await this.prisma.$transaction([
      // Update batch tutor
      this.prisma.batch.update({
        where: { id: batchId },
        data: { tutorId: dto.staffId },
      }),
      // Mark user as tutor
      this.prisma.user.update({
        where: { id: dto.staffId },
        data: { isTutor: true },
      }),
      // Create staff-batch mapping (upsert to avoid duplicates)
      this.prisma.staffBatchMapping.upsert({
        where: {
          staffId_batchId_roleType: {
            staffId: dto.staffId,
            batchId,
            roleType: StaffBatchRoleType.TUTOR,
          },
        },
        create: {
          staffId: dto.staffId,
          batchId,
          roleType: StaffBatchRoleType.TUTOR,
        },
        update: {},
      }),
    ]);

    this.logger.log(
      `Tutor ${dto.staffId} assigned to batch ${batchId} by HOD ${currentUser.userId}`,
    );

    return { message: 'Tutor assigned successfully' };
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
}
