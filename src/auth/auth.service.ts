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
    // Find users by email across the entire platform
    const users = await this.prisma.user.findMany({
      where: { email: dto.email },
    });

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (users.length > 1) {
      throw new BadRequestException('Multiple accounts found for this email. Please contact support.');
    }

    const user = users[0];

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

    // Return the token and complete user details (excluding password)
    const { password, ...userDetails } = user;

    return {
      accessToken: this.jwtService.sign(payload),
      user: userDetails,
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
