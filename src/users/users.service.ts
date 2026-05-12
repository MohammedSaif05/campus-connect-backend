import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Internal service for user operations.
 * Used by Auth, Staff, Students, and HOD-creation flows.
 * Not exposed via a controller.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Find a user by email within a specific college.
   */
  async findByEmailAndCollege(email: string, collegeId: string) {
    return this.prisma.user.findUnique({
      where: { collegeId_email: { collegeId, email } },
    });
  }

  /**
   * Create a new user with a hashed password.
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    collegeId: string;
    departmentId?: string;
    isTutor?: boolean;
    mustChangePassword?: boolean;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        collegeId: data.collegeId,
        departmentId: data.departmentId ?? null,
        isTutor: data.isTutor ?? false,
        mustChangePassword: data.mustChangePassword ?? false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTutor: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTutor: true,
        departmentId: true,
        isActive: true,
        profileImageUrl: true,
        phoneNumber: true,
        bio: true,
        department: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; phoneNumber?: string; bio?: string }, file?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let profileImageUrl = user.profileImageUrl;

    if (file) {
      if (profileImageUrl) {
        await this.storage.deleteFile(profileImageUrl).catch((err) => {
          console.error('Failed to delete old profile image:', err);
        });
      }
      profileImageUrl = await this.storage.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        `profiles/${userId}`
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? user.name,
        phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : user.phoneNumber,
        bio: data.bio !== undefined ? data.bio : user.bio,
        profileImageUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImageUrl: true,
        phoneNumber: true,
        bio: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
