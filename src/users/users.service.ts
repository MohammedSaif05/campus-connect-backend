import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Internal service for user operations.
 * Used by Auth, Staff, Students, and HOD-creation flows.
 * Not exposed via a controller.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
