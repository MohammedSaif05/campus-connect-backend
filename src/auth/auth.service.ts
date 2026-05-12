import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // Find user by email, including department name
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        isTutor: true,
        collegeId: true,
        departmentId: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Build JWT payload
    const payload: JwtPayload = {
      userId: user.id,
      collegeId: user.collegeId,
      role: user.role,
      isTutor: user.isTutor,
      departmentId: user.departmentId,
    };

    this.logger.log(`User ${user.id} (${user.role}) logged in`);

    // Resolve batch details for STAFF (tutor) and STUDENT roles
    const batchSelect = {
      id: true,
      name: true,
      startYear: true,
      endYear: true,
      currentSemester: true,
      isPassedOut: true,
      department: {
        select: { id: true, name: true },
      },
    };

    let batch: {
      id: string;
      name: string;
      startYear: number;
      endYear: number;
      currentSemester: number;
      isPassedOut: boolean;
      department?: { id: string; name: string };
    } | null = null;

    if (user.role === 'STAFF' && user.isTutor) {
      const mapping = await this.prisma.staffBatchMapping.findFirst({
        where: { staffId: user.id, roleType: 'TUTOR' },
        select: { batch: { select: batchSelect } },
      });
      batch = mapping?.batch ?? null;
    } else if (user.role === 'STUDENT') {
      const studentRecord = await this.prisma.student.findUnique({
        where: { userId: user.id },
        select: { batch: { select: batchSelect } },
      });
      batch = studentRecord?.batch ?? null;
    }

    if (!payload.departmentId && batch && batch.department) {
      payload.departmentId = batch.department.id;
    }

    // Return token + user details (excluding password)
    const { password, ...userDetails } = user;

    // If user's direct department is null (common for students), populate it from batch
    if (!userDetails.department && batch && batch.department) {
      userDetails.department = batch.department;
    }

    // Remove department from batch to keep payload clean
    const { department: _dept, ...batchWithoutDept } = batch || {};

    return {
      accessToken: this.jwtService.sign(payload),
      user: { ...userDetails, batch: batch ? batchWithoutDept : null },
    };
  }


  /**
   * Changes the authenticated user's password.
   * Clears the mustChangePassword flag after successful change.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and update
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    this.logger.log(`User ${userId} changed their password`);

    return { message: 'Password changed successfully' };
  }
}
