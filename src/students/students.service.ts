import {
  Injectable,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, StaffBatchRoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Validates that the current user is a tutor assigned to the specified batch.
   */
  private async validateTutorForBatch(
    currentUser: JwtPayload,
    batchId: string,
  ): Promise<void> {
    if (currentUser.role !== Role.STAFF || !currentUser.isTutor) {
      throw new ForbiddenException('Only tutors can perform this action');
    }

    const mapping = await this.prisma.staffBatchMapping.findFirst({
      where: {
        staffId: currentUser.userId,
        batchId,
        roleType: StaffBatchRoleType.TUTOR,
      },
    });

    if (!mapping) {
      throw new ForbiddenException('You are not the tutor of this batch');
    }
  }

  /**
   * Creates a student user + student record.
   * Default password = DOB (hashed). Must be changed on first login.
   */
  async create(dto: CreateStudentDto, currentUser: JwtPayload) {
    if (!currentUser.collegeId) {
      throw new ForbiddenException('User must belong to a college');
    }

    await this.validateTutorForBatch(currentUser, dto.batchId);

    // Verify batch exists in the tutor's college
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, collegeId: currentUser.collegeId },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found in your college');
    }

    // Check for duplicate email
    const existingUser = await this.usersService.findByEmailAndCollege(
      dto.email,
      currentUser.collegeId,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists in this college');
    }

    // Check for duplicate register number
    const existingStudent = await this.prisma.student.findUnique({
      where: {
        collegeId_registerNumber: {
          collegeId: currentUser.collegeId,
          registerNumber: dto.registerNumber,
        },
      },
    });

    if (existingStudent) {
      throw new ConflictException(
        'Register number already exists in this college',
      );
    }

    // Create user + student in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user with DOB as default password (hashed by UsersService)
      const user = await this.usersService.create({
        name: dto.name,
        email: dto.email,
        password: dto.dob, // Will be hashed by UsersService
        role: Role.STUDENT,
        collegeId: currentUser.collegeId!,
        mustChangePassword: true,
      });

      // Create student record
      const student = await tx.student.create({
        data: {
          userId: user.id,
          collegeId: currentUser.collegeId!,
          registerNumber: dto.registerNumber,
          batchId: dto.batchId,
        },
        select: {
          id: true,
          registerNumber: true,
          batchId: true,
        },
      });

      return { ...user, student };
    });

    this.logger.log(
      `Student "${dto.name}" created by tutor ${currentUser.userId}`,
    );

    return result;
  }

  /**
   * Lists students in a batch. Tutor sees their own batch students.
   */
  async findAll(
    batchId: string,
    currentUser: JwtPayload,
    query: PaginationQueryDto,
  ) {
    // Tutors can only see their assigned batches
    if (currentUser.role === Role.STAFF) {
      await this.validateTutorForBatch(currentUser, batchId);
    }

    const where = {
      batchId,
      college: { id: currentUser.collegeId! },
    };

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          registerNumber: true,
          batchId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }
}
