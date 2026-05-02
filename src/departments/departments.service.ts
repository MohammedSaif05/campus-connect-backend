import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { CreateHodDto } from './dto/create-hod.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateDepartmentDto) {
    // Verify the college exists
    const college = await this.prisma.college.findUnique({
      where: { id: dto.collegeId },
    });

    if (!college) {
      throw new NotFoundException('College not found');
    }

    return this.prisma.department.create({
      data: { name: dto.name, collegeId: dto.collegeId },
      select: { id: true, name: true, collegeId: true },
    });
  }

  async findAll(collegeId: string, query: PaginationQueryDto) {
    const where = { collegeId };

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        ...getPrismaPageParams(query),
        select: { id: true, name: true, collegeId: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.department.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }

  async updateDepartment(id: string, dto: import('./dto/update-department.dto.js').UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.department.update({
      where: { id },
      data: { name: dto.name },
      select: { id: true, name: true, collegeId: true },
    });
  }

  /**
   * Creates an HOD user and assigns them to a department.
   */
  async createHod(dto: CreateHodDto) {
    // Verify department exists and belongs to the specified college
    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, collegeId: dto.collegeId },
    });

    if (!department) {
      throw new NotFoundException(
        'Department not found in the specified college',
      );
    }

    // Check for duplicate email within the college
    const existing = await this.usersService.findByEmailAndCollege(
      dto.email,
      dto.collegeId,
    );

    if (existing) {
      throw new ConflictException('Email already exists in this college');
    }

    return this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: Role.HOD,
      collegeId: dto.collegeId,
      departmentId: dto.departmentId,
      mustChangePassword: true,
    });
  }

  /**
   * Updates an existing HOD user.
   */
  async updateHod(id: string, dto: import('./dto/update-hod.dto.js').UpdateHodDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.HOD },
    });

    if (!user) {
      throw new NotFoundException('HOD not found');
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, collegeId: user.collegeId! },
      });
      if (!department) {
        throw new NotFoundException('Department not found in the specified college');
      }
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersService.findByEmailAndCollege(dto.email, user.collegeId!);
      if (existing) {
        throw new ConflictException('Email already exists in this college');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        departmentId: dto.departmentId,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTutor: true,
        departmentId: true,
        isActive: true,
      },
    });
  }
}
