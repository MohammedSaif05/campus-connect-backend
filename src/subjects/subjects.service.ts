import {
  Injectable,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, StaffBatchRoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateSubjectDto } from './dto/update-subject.dto.js';
import { AssignSubjectDto } from './dto/assign-subject.dto.js';
import { SubjectQueryDto } from './dto/subject-query.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class SubjectsService {
  private readonly logger = new Logger(SubjectsService.name);

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
        semester: dto.semester,
      },
      select: {
        id: true,
        name: true,
        subjectCode: true,
        departmentId: true,
        semester: true,
      },
    });
  }

  async findAll(currentUser: JwtPayload, query: SubjectQueryDto) {
    const where: any = { collegeId: currentUser.collegeId! };

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { subjectCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.semester !== undefined) {
      where.semester = query.semester;
    }

    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          name: true,
          subjectCode: true,
          departmentId: true,
          semester: true,
        },
        orderBy: [{ semester: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.subject.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }

  /**
   * Returns complete details of a single subject including its
   * department, batch assignments (with teaching staff), and timetable count.
   */
  async findOne(subjectId: string, currentUser: JwtPayload) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        collegeId: currentUser.collegeId!,
      },
      select: {
        id: true,
        name: true,
        subjectCode: true,
        semester: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        assignments: {
          select: {
            id: true,
            batch: { select: { id: true, name: true } },
            staff: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { timetableSlots: true } },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found in your college');
    }

    return subject;
  }

  /**
   * Updates a subject. Checks for code conflicts if subjectCode is changed.
   */
  async update(
    subjectId: string,
    dto: UpdateSubjectDto,
    currentUser: JwtPayload,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        collegeId: currentUser.collegeId!,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found in your college');
    }

    // Check duplicate code if being changed
    if (dto.subjectCode && dto.subjectCode !== subject.subjectCode) {
      const existing = await this.prisma.subject.findUnique({
        where: {
          collegeId_subjectCode: {
            collegeId: currentUser.collegeId!,
            subjectCode: dto.subjectCode,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Subject code "${dto.subjectCode}" already exists in this college`,
        );
      }
    }

    const updated = await this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.subjectCode && { subjectCode: dto.subjectCode }),
        ...(dto.semester !== undefined && { semester: dto.semester }),
      },
      select: {
        id: true,
        name: true,
        subjectCode: true,
        departmentId: true,
        semester: true,
      },
    });

    this.logger.log(
      `Subject ${subjectId} updated by ${currentUser.role} ${currentUser.userId}`,
    );

    return updated;
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
