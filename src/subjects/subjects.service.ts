import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, StaffBatchRoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { AssignSubjectDto } from './dto/assign-subject.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto, currentUser: JwtPayload) {
    if (!currentUser.collegeId) {
      throw new ForbiddenException('User must belong to a college');
    }

    // Check duplicate subject code within college
    const existing = await this.prisma.subject.findUnique({
      where: {
        collegeId_subjectCode: {
          collegeId: currentUser.collegeId,
          subjectCode: dto.subjectCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Subject code "${dto.subjectCode}" already exists in this college`,
      );
    }

    return this.prisma.subject.create({
      data: {
        name: dto.name,
        subjectCode: dto.subjectCode,
        collegeId: currentUser.collegeId,
        departmentId: dto.departmentId,
      },
      select: {
        id: true,
        name: true,
        subjectCode: true,
        departmentId: true,
      },
    });
  }

  async findAll(currentUser: JwtPayload, query: PaginationQueryDto) {
    const where = { collegeId: currentUser.collegeId! };

    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          name: true,
          subjectCode: true,
          departmentId: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.subject.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }

  /**
   * Assigns a subject to a staff member for a specific batch.
   * Also creates a SUBJECT_TEACHER StaffBatchMapping.
   */
  async assignToStaff(dto: AssignSubjectDto, currentUser: JwtPayload) {
    if (!currentUser.collegeId) {
      throw new ForbiddenException('User must belong to a college');
    }

    // Verify subject exists in the college
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, collegeId: currentUser.collegeId },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found in your college');
    }

    // Verify batch exists in the college
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, collegeId: currentUser.collegeId },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your college');
    }

    // Verify staff exists and is active
    const staff = await this.prisma.user.findFirst({
      where: {
        id: dto.staffId,
        collegeId: currentUser.collegeId,
        role: Role.STAFF,
        isActive: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Transaction: create assignment + staff-batch mapping
    await this.prisma.$transaction([
      this.prisma.subjectAssignment.upsert({
        where: {
          subjectId_batchId: {
            subjectId: dto.subjectId,
            batchId: dto.batchId,
          },
        },
        create: {
          subjectId: dto.subjectId,
          batchId: dto.batchId,
          staffId: dto.staffId,
        },
        update: { staffId: dto.staffId },
      }),
      this.prisma.staffBatchMapping.upsert({
        where: {
          staffId_batchId_roleType: {
            staffId: dto.staffId,
            batchId: dto.batchId,
            roleType: StaffBatchRoleType.SUBJECT_TEACHER,
          },
        },
        create: {
          staffId: dto.staffId,
          batchId: dto.batchId,
          roleType: StaffBatchRoleType.SUBJECT_TEACHER,
        },
        update: {},
      }),
    ]);

    return { message: 'Subject assigned successfully' };
  }
}
