import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { CreateHackathonDto } from './dto/create-hackathon.dto.js';
import { RegisterTeamDto } from './dto/register-team.dto.js';
import { AddProgressDto } from './dto/add-progress.dto.js';

@Injectable()
export class HackathonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createHackathon(
    user: JwtPayload,
    dto: CreateHackathonDto,
    file?: Express.Multer.File,
  ) {
    if (!user.departmentId) {
      throw new ForbiddenException('HOD must belong to a department');
    }

    let thumbnailUrl: string | null = null;

    const hackathon = await this.prisma.hackathon.create({
      data: {
        name: dto.name,
        description: dto.description,
        isGroup: dto.isGroup,
        minSize: dto.isGroup ? dto.minSize : null,
        maxSize: dto.isGroup ? dto.maxSize : null,
        registrationDeadline: new Date(dto.registrationDeadline),
        hackathonDate: new Date(dto.hackathonDate),
        collegeId: user.collegeId!,
        departmentId: user.departmentId!,
        createdById: user.userId,
      },
    });

    if (file) {
      const folderPath = `hackathons/${user.collegeId}/${hackathon.id}`;
      thumbnailUrl = await this.storage.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folderPath,
      );

      await this.prisma.hackathon.update({
        where: { id: hackathon.id },
        data: { thumbnailUrl },
      });
    }

    return { ...hackathon, thumbnailUrl };
  }

  async findAll(user: JwtPayload) {
    if (!user.departmentId) {
      throw new BadRequestException('User must belong to a department to view hackathons');
    }

    return this.prisma.hackathon.findMany({
      where: {
        collegeId: user.collegeId!,
        departmentId: user.departmentId!,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { teams: true },
        },
      },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id, collegeId: user.collegeId! },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!hackathon) throw new NotFoundException('Hackathon not found');
    return hackathon;
  }

  async registerTeam(
    id: string,
    user: JwtPayload,
    dto: RegisterTeamDto,
  ) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id, collegeId: user.collegeId! },
    });

    if (!hackathon) throw new NotFoundException('Hackathon not found');

    if (new Date() > hackathon.registrationDeadline) {
      throw new BadRequestException('Registration deadline has passed');
    }

    // Get the leader student record
    const leader = await this.prisma.student.findUnique({
      where: { userId: user.userId },
    });

    if (!leader) throw new BadRequestException('Only students can register');

    // Build the list of members (including leader)
    const memberIds = [...new Set([leader.id, ...(dto.memberIds || [])])];

    if (hackathon.isGroup) {
      if (memberIds.length < hackathon.minSize!) {
        throw new BadRequestException(`Team must have at least ${hackathon.minSize} members`);
      }
      if (memberIds.length > hackathon.maxSize!) {
        throw new BadRequestException(`Team cannot have more than ${hackathon.maxSize} members`);
      }
    } else {
      if (memberIds.length > 1) {
        throw new BadRequestException('This is a solo hackathon');
      }
    }

    // Check if any member is already registered for this hackathon
    const existingParticipation = await this.prisma.hackathonTeamMember.findFirst({
      where: {
        hackathonId: hackathon.id,
        studentId: { in: memberIds },
      },
      include: { student: { select: { registerNumber: true } } },
    });

    if (existingParticipation) {
      throw new BadRequestException(`Student ${existingParticipation.student.registerNumber} is already registered for this hackathon`);
    }

    // Create Team and Members in a transaction
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.hackathonTeam.create({
        data: {
          hackathonId: hackathon.id,
          leaderId: leader.id,
          teamName: dto.teamName || null,
          ideaTitle: dto.ideaTitle,
          ideaDescription: dto.ideaDescription,
          members: {
            create: memberIds.map((studentId) => ({
              studentId,
              hackathonId: hackathon.id,
            })),
          },
        },
        include: {
          members: {
            include: {
              student: {
                select: { id: true, registerNumber: true, user: { select: { name: true } } },
              },
            },
          },
        },
      });

      return team;
    });
  }

  async getHackathonTeams(id: string, user: JwtPayload) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id, collegeId: user.collegeId! },
    });

    if (!hackathon) throw new NotFoundException('Hackathon not found');

    return this.prisma.hackathonTeam.findMany({
      where: { hackathonId: id },
      include: {
        leader: {
          select: { registerNumber: true, user: { select: { name: true } } },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyTeams(user: JwtPayload) {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.userId },
    });

    if (!student) throw new ForbiddenException('Only students can fetch their teams');

    return this.prisma.hackathonTeam.findMany({
      where: {
        members: {
          some: { studentId: student.id },
        },
      },
      include: {
        hackathon: {
          select: { name: true, hackathonDate: true, thumbnailUrl: true },
        },
        leader: {
          select: { user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeamDetails(teamId: string, user: JwtPayload) {
    const team = await this.prisma.hackathonTeam.findUnique({
      where: { id: teamId },
      include: {
        hackathon: true,
        leader: {
          select: { registerNumber: true, user: { select: { name: true } } },
        },
        members: {
          include: {
            student: {
              select: { id: true, registerNumber: true, user: { select: { name: true } }, batch: { select: { name: true } } },
            },
          },
        },
        progress: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!team || team.hackathon.collegeId !== user.collegeId) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async addProgress(teamId: string, user: JwtPayload, dto: AddProgressDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.userId },
    });

    if (!student) throw new ForbiddenException('Only students can add progress');

    const member = await this.prisma.hackathonTeamMember.findFirst({
      where: { teamId, studentId: student.id },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this team');
    }

    return this.prisma.hackathonProgress.create({
      data: {
        teamId,
        description: dto.description,
        date: new Date(dto.date),
      },
    });
  }
}
