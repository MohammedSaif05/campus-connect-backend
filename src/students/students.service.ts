import {
  Injectable,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, StaffBatchRoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { StudentQueryDto } from './dto/student-query.dto.js';
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
        departmentId: batch.departmentId,
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
   * Lists students in a batch with search and isActive filter.
   * Response shape: id, name, registerNumber, isActive (flat — no nested user object).
   */
  async findAll(
    currentUser: JwtPayload,
    query: StudentQueryDto,
  ) {
    let batchId = query.batchId;

    // Students: auto-resolve batchId from their own record
    if (currentUser.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: currentUser.userId },
        select: { batchId: true },
      });
      if (!student) {
        throw new NotFoundException('Student record not found');
      }
      batchId = student.batchId;
    }

    if (!batchId) {
      throw new ForbiddenException('batchId query parameter is required');
    }

    // Tutors can only see their assigned batch
    if (currentUser.role === Role.STAFF) {
      await this.validateTutorForBatch(currentUser, batchId);
    }

    const where: any = {
      batchId,
      collegeId: currentUser.collegeId!,
      user: { isActive: query.isActive ?? true },
    };

    if (query.search?.trim()) {
      where.OR = [
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { registerNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          registerNumber: true,
          user: { select: { name: true, isActive: true } },
        },
        orderBy: { user: { name: 'asc' } },
      }),
      this.prisma.student.count({ where }),
    ]);

    // Flatten: { id, name, registerNumber, isActive }
    const flattened = data.map((s) => ({
      id: s.id,
      name: s.user.name,
      registerNumber: s.registerNumber,
      isActive: s.user.isActive,
    }));

    return paginatedResponse(flattened, total, query);
  }

  /**
   * Returns full details of a single student.
   */
  async findOne(studentId: string, currentUser: JwtPayload) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        collegeId: currentUser.collegeId!,
      },
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
            mustChangePassword: true,
            createdAt: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
            startYear: true,
            endYear: true,
            currentSemester: true,
            isPassedOut: true,
          },
        },
        _count: { select: { odRequests: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found in your college');
    }

    // Tutors can only view students in their own batch
    if (currentUser.role === Role.STAFF) {
      await this.validateTutorForBatch(currentUser, student.batchId);
    }

    return student;
  }

  /**
   * Updates a student member. Only active students can be edited.
   */
  async update(
    studentId: string,
    dto: UpdateStudentDto,
    currentUser: JwtPayload,
  ) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        collegeId: currentUser.collegeId!,
      },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found in your college');
    }

    if (!student.user.isActive) {
      throw new BadRequestException(
        'Cannot edit a deactivated student member. Activate them first.',
      );
    }

    // Tutors can only edit students in their own batch
    if (currentUser.role === Role.STAFF) {
      await this.validateTutorForBatch(currentUser, student.batchId);
    }

    if (dto.email && dto.email !== student.user.email) {
      const existingUser = await this.usersService.findByEmailAndCollege(
        dto.email,
        currentUser.collegeId!,
      );
      if (existingUser) {
        throw new ConflictException('Email already exists in this college');
      }
    }

    if (dto.registerNumber && dto.registerNumber !== student.registerNumber) {
      const existingStudent = await this.prisma.student.findUnique({
        where: {
          collegeId_registerNumber: {
            collegeId: currentUser.collegeId!,
            registerNumber: dto.registerNumber,
          },
        },
      });
      if (existingStudent) {
        throw new ConflictException(
          'Register number already exists in this college',
        );
      }
    }

    const userUpdateData: any = {};
    if (dto.name) userUpdateData.name = dto.name;
    if (dto.email) userUpdateData.email = dto.email;
    if (dto.dob) {
      userUpdateData.password = await bcrypt.hash(dto.dob, 10);
      userUpdateData.mustChangePassword = true;
    }

    const studentUpdateData: any = {};
    if (dto.registerNumber) studentUpdateData.registerNumber = dto.registerNumber;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: student.userId },
          data: userUpdateData,
        });
      }

      if (Object.keys(studentUpdateData).length > 0) {
        await tx.student.update({
          where: { id: studentId },
          data: studentUpdateData,
        });
      }

      return this.findOne(studentId, currentUser);
    });
  }

  /**
   * Deactivates a student (soft delete).
   */
  async deactivate(studentId: string, currentUser: JwtPayload) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        collegeId: currentUser.collegeId!,
      },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found in your college');
    }

    if (!student.user.isActive) {
      throw new BadRequestException('Student is already deactivated');
    }

    if (currentUser.role === Role.STAFF) {
      await this.validateTutorForBatch(currentUser, student.batchId);
    }

    await this.prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    });

    this.logger.log(
      `Student ${studentId} deactivated by ${currentUser.role} ${currentUser.userId}`,
    );

    return { message: 'Student deactivated successfully' };
  }
}
