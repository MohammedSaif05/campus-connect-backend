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

    // Resolve batchId for STAFF (tutor) and STUDENT roles
    let batchId: string | null = null;

    if (user.role === 'STAFF' && user.isTutor) {
      // Find the active batch this staff is tutoring
      const mapping = await this.prisma.staffBatchMapping.findFirst({
        where: { staffId: user.id, roleType: 'TUTOR' },
        select: { batchId: true },
      });
      batchId = mapping?.batchId ?? null;
    } else if (user.role === 'STUDENT') {
      // Find the student record to get their batch
      const studentRecord = await this.prisma.student.findUnique({
        where: { userId: user.id },
        select: { batchId: true },
      });
      batchId = studentRecord?.batchId ?? null;
    }

    // Return token + user details (excluding password)
    const { password, ...userDetails } = user;

    return {
      accessToken: this.jwtService.sign(payload),
      user: { ...userDetails, batchId },
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
