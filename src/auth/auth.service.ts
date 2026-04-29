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

  /**
   * Authenticates a user by college code, email, and password.
   * SUPER_ADMIN uses collegeCode = "PLATFORM" (has no college).
   * All other users use their actual college code.
   */
  async login(dto: LoginDto) {
    let user;

    if (dto.collegeCode === 'PLATFORM') {
      // SUPER_ADMIN login — no college association
      user = await this.prisma.user.findFirst({
        where: { email: dto.email, collegeId: null },
        select: {
          id: true,
          password: true,
          role: true,
          isTutor: true,
          departmentId: true,
          collegeId: true,
          isActive: true,
          mustChangePassword: true,
        },
      });
    } else {
      // Normal login — find the college, then find the user within it
      const college = await this.prisma.college.findUnique({
        where: { collegeCode: dto.collegeCode },
        select: { id: true },
      });

      if (!college) {
        throw new UnauthorizedException('Invalid credentials');
      }

      user = await this.prisma.user.findUnique({
        where: {
          collegeId_email: {
            collegeId: college.id,
            email: dto.email,
          },
        },
        select: {
          id: true,
          password: true,
          role: true,
          isTutor: true,
          departmentId: true,
          collegeId: true,
          isActive: true,
          mustChangePassword: true,
        },
      });
    }

    if (!user || !user.isActive) {
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

    return {
      accessToken: this.jwtService.sign(payload),
      mustChangePassword: user.mustChangePassword,
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
