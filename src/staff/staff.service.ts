import {
  Injectable,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Creates a staff member within the HOD's college and department.
   * Default password is set to email prefix + "@123" and must be changed on first login.
   */
  async create(dto: CreateStaffDto, currentUser: JwtPayload) {
    const { collegeId, departmentId } = currentUser;

    if (!collegeId || !departmentId) {
      throw new ForbiddenException('HOD must belong to a college and department');
    }

    // Duplicate email check
    const existing = await this.usersService.findByEmailAndCollege(
      dto.email,
      collegeId,
    );

    if (existing) {
      throw new ConflictException('Email already exists in this college');
    }

    // Default password: email prefix + @123
    const defaultPassword = dto.email.split('@')[0] + '@123';

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: defaultPassword,
      role: Role.STAFF,
      collegeId,
      departmentId,
      isTutor: dto.isTutor ?? false,
      mustChangePassword: true,
    });

    this.logger.log(
      `Staff "${dto.name}" created by HOD ${currentUser.userId}`,
    );

    return user;
  }

  /**
   * Lists all active staff in the HOD's college and department.
   */
  async findAll(currentUser: JwtPayload, query: PaginationQueryDto) {
    const where = {
      collegeId: currentUser.collegeId!,
      departmentId: currentUser.departmentId!,
      role: Role.STAFF,
      isActive: true,
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          name: true,
          email: true,
          isTutor: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }

  /**
   * Updates a staff member. HOD can only update staff in their own college+department.
   */
  async update(
    staffId: string,
    dto: UpdateStaffDto,
    currentUser: JwtPayload,
  ) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
        role: Role.STAFF,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found in your department');
    }

    return this.prisma.user.update({
      where: { id: staffId },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        isTutor: true,
        isActive: true,
      },
    });
  }

  /**
   * Soft-deactivates a staff member. Never hard deletes.
   */
  async deactivate(staffId: string, currentUser: JwtPayload) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
        role: Role.STAFF,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found in your department');
    }

    await this.prisma.user.update({
      where: { id: staffId },
      data: { isActive: false },
    });

    this.logger.log(
      `Staff ${staffId} deactivated by HOD ${currentUser.userId}`,
    );

    return { message: 'Staff member deactivated' };
  }
}
