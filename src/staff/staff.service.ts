import {
  Injectable,
  BadRequestException,
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
import { StaffQueryDto } from './dto/staff-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

/** Reusable select shape for a full staff profile */
const STAFF_DETAIL_SELECT = {
  id: true,
  name: true,
  email: true,
  isTutor: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
} as const;

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
   * Returns full details of a single staff member in the HOD's department.
   * Works for both active and inactive staff (view-only for deactivated).
   */
  async findOne(staffId: string, currentUser: JwtPayload) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
        role: Role.STAFF,
        // No isActive filter — both active and deactivated can be viewed
      },
      select: STAFF_DETAIL_SELECT,
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found in your department');
    }

    return staff;
  }

  /**
   * Lists staff in the HOD's department.
   * ?isActive=true (default) → active staff
   * ?isActive=false         → deactivated staff
   */
  async findAll(currentUser: JwtPayload, query: StaffQueryDto) {
    const where: any = {
      collegeId: currentUser.collegeId!,
      departmentId: currentUser.departmentId!,
      role: Role.STAFF,
      // Default to active; pass ?isActive=false for deactivated
      isActive: query.isActive ?? true,
    };

    // Search by name or email (case-insensitive partial match)
    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

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
   * Updates a staff member. Only active staff can be edited.
   * Checks for email conflicts if email is being changed.
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

    if (!staff.isActive) {
      throw new BadRequestException('Cannot edit a deactivated staff member. Activate them first.');
    }

    // If email is being changed, check for duplicates within the college
    if (dto.email && dto.email !== staff.email) {
      const duplicate = await this.usersService.findByEmailAndCollege(
        dto.email,
        currentUser.collegeId!,
      );
      if (duplicate) {
        throw new ConflictException('Email already exists in this college');
      }
    }

    return this.prisma.user.update({
      where: { id: staffId },
      data: dto,
      select: STAFF_DETAIL_SELECT,
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
        isActive: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Active staff member not found in your department');
    }

    await this.prisma.user.update({
      where: { id: staffId },
      data: { isActive: false },
    });

    this.logger.log(`Staff ${staffId} deactivated by HOD ${currentUser.userId}`);
    return { message: 'Staff member deactivated' };
  }

  /**
   * Re-activates a previously deactivated staff member.
   */
  async activate(staffId: string, currentUser: JwtPayload) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        collegeId: currentUser.collegeId!,
        departmentId: currentUser.departmentId!,
        role: Role.STAFF,
        isActive: false,
      },
    });

    if (!staff) {
      throw new NotFoundException('Deactivated staff member not found in your department');
    }

    await this.prisma.user.update({
      where: { id: staffId },
      data: { isActive: true },
    });

    this.logger.log(`Staff ${staffId} activated by HOD ${currentUser.userId}`);
    return { message: 'Staff member activated' };
  }
}
