import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCollegeDto } from './dto/create-college.dto.js';
import { UpdateCollegeDto } from './dto/update-college.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class CollegesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCollegeDto) {
    // Check for duplicate college code
    const existing = await this.prisma.college.findUnique({
      where: { collegeCode: dto.collegeCode },
    });

    if (existing) {
      throw new ConflictException(
        `College with code "${dto.collegeCode}" already exists`,
      );
    }

    return this.prisma.college.create({
      data: {
        name: dto.name,
        emailAddress: dto.emailAddress,
        collegeCode: dto.collegeCode,
        city: dto.city,
        state: dto.state,
      },
      select: {
        id: true,
        name: true,
        emailAddress: true,
        collegeCode: true,
        city: true,
        state: true,
        createdAt: true,
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const [data, total] = await Promise.all([
      this.prisma.college.findMany({
        ...getPrismaPageParams(query),
        select: {
          id: true,
          name: true,
          emailAddress: true,
          collegeCode: true,
          city: true,
          state: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.college.count(),
    ]);

    return paginatedResponse(data, total, query);
  }

  async update(id: string, dto: UpdateCollegeDto) {
    const college = await this.prisma.college.findUnique({ where: { id } });

    if (!college) {
      throw new NotFoundException('College not found');
    }

    return this.prisma.college.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        name: true,
        emailAddress: true,
        collegeCode: true,
        city: true,
        state: true,
        updatedAt: true,
      },
    });
  }
}
