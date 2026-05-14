import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Role,
  OdStatus,
  ApprovalRole,
  OdApprovalStatus,
  StaffBatchRoleType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateOdRequestDto } from './dto/create-od-request.dto.js';
import { OdActionDto } from './dto/od-action.dto.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { OdQueryDto } from './dto/od-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

/**
 * Strict OD state machine transitions.
 * ANY other transition throws an error.
 */
const VALID_TRANSITIONS: Record<string, OdStatus> = {
  [`${OdStatus.PENDING_TUTOR}_APPROVED`]: OdStatus.PENDING_HOD,
  [`${OdStatus.PENDING_TUTOR}_REJECTED`]: OdStatus.REJECTED_BY_TUTOR,
  [`${OdStatus.PENDING_HOD}_APPROVED`]: OdStatus.APPROVED,
  [`${OdStatus.PENDING_HOD}_REJECTED`]: OdStatus.REJECTED_BY_HOD,
};

@Injectable()
export class OdService {
  private readonly logger = new Logger(OdService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Student creates an OD request.
   * Status starts at PENDING_TUTOR.
   */
  async create(dto: CreateOdRequestDto, currentUser: JwtPayload) {
    if (currentUser.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can create OD requests');
    }

    if (!currentUser.collegeId) {
      throw new ForbiddenException('User must belong to a college');
    }

    // Get the student record for this user (include name for notifications)
    const student = await this.prisma.student.findUnique({
      where: { userId: currentUser.userId },
      select: {
        id: true,
        batchId: true,
        user: { select: { name: true } },
        batch: {
          select: {
            id: true,
            collegeId: true,
            tutorId: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    const isGroup = dto.isGroup ?? false;

    // Build participant IDs (always include the creator)
    const participantStudentIds = new Set<string>([student.id]);
    if (isGroup && dto.participantIds?.length) {
      for (const pid of dto.participantIds) {
        participantStudentIds.add(pid);
      }
    }

    // Create the OD request with participants in a transaction
    const odRequest = await this.prisma.$transaction(async (tx) => {
      const od = await tx.odRequest.create({
        data: {
          studentId: student.id,
          batchId: student.batchId,
          collegeId: currentUser.collegeId!,
          subject: dto.subject,
          description: dto.description,
          isGroup,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: OdStatus.PENDING_TUTOR,
          currentLevel: ApprovalRole.TUTOR,
        },
        select: {
          id: true,
          subject: true,
          description: true,
          isGroup: true,
          startDate: true,
          endDate: true,
          status: true,
          currentLevel: true,
          createdAt: true,
        },
      });

      // Create participant records
      await tx.odParticipant.createMany({
        data: Array.from(participantStudentIds).map((sid) => ({
          odRequestId: od.id,
          studentId: sid,
        })),
      });

      return od;
    });

    // Notify the batch tutor
    if (student.batch.tutorId) {
      const studentName = student.user.name;
      await this.notificationsService.create({
        userId: student.batch.tutorId,
        collegeId: currentUser.collegeId,
        title: '📋 New OD Request',
        message: `${studentName} submitted ${isGroup ? 'a group' : 'an individual'} OD request for "${dto.subject}". Please review and take action.`,
      });
    }

    this.logger.log(
      `OD request ${odRequest.id} created by student ${currentUser.userId} (group: ${isGroup}, participants: ${participantStudentIds.size})`,
    );

    return odRequest;
  }

  /**
   * Role-based OD request listing:
   * - STUDENT: own requests
   * - STAFF (tutor): PENDING_TUTOR requests for their batches
   * - HOD: PENDING_HOD requests for their department
   * - SUPER_ADMIN: all requests
   */
  async findAll(currentUser: JwtPayload, query: OdQueryDto) {
    let where: any = {};

    switch (currentUser.role) {
      case Role.STUDENT: {
        const student = await this.prisma.student.findUnique({
          where: { userId: currentUser.userId },
          select: { id: true },
        });

        if (!student) {
          throw new NotFoundException('Student record not found');
        }

        where = {
          OR: [
            { studentId: student.id },
            { participants: { some: { studentId: student.id } } },
          ],
          collegeId: currentUser.collegeId,
        };
        // If student passes a status filter, apply it
        if (query.status) {
          where.status = query.status;
        }
        break;
      }

      case Role.STAFF: {
        if (!currentUser.isTutor) {
          throw new ForbiddenException(
            'Only tutors can view OD requests',
          );
        }

        // Get batches this tutor is assigned to
        const mappings = await this.prisma.staffBatchMapping.findMany({
          where: {
            staffId: currentUser.userId,
            roleType: StaffBatchRoleType.TUTOR,
          },
          select: { batchId: true },
        });

        const tutorBatchIds = mappings.map((m) => m.batchId);

        where = {
          batchId: { in: tutorBatchIds },
          collegeId: currentUser.collegeId,
          // Allow optional status override, default to PENDING_TUTOR
          status: query.status ?? OdStatus.PENDING_TUTOR,
        };
        break;
      }

      case Role.HOD: {
        // Get all batches in HOD's department
        const batches = await this.prisma.batch.findMany({
          where: {
            collegeId: currentUser.collegeId!,
            departmentId: currentUser.departmentId!,
          },
          select: { id: true },
        });

        const hodBatchIds = batches.map((b) => b.id);

        where = {
          batchId: { in: hodBatchIds },
          collegeId: currentUser.collegeId,
          // Allow optional status override, default to PENDING_HOD
          status: query.status ?? OdStatus.PENDING_HOD,
        };
        break;
      }

      case Role.SUPER_ADMIN: {
        // SUPER_ADMIN sees everything
        where = {};
        if (query.status) {
          where.status = query.status;
        }
        break;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.odRequest.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          subject: true,
          description: true,
          isGroup: true,
          startDate: true,
          endDate: true,
          status: true,
          currentLevel: true,
          createdAt: true,
          student: {
            select: {
              registerNumber: true,
              user: { select: { name: true, email: true } },
            },
          },
          batch: { select: { id: true, name: true, currentSemester: true } },
          approvals: {
            select: {
              role: true,
              status: true,
              remark: true,
              timestamp: true,
              approver: { select: { name: true } },
            },
            orderBy: { timestamp: 'asc' },
          },
          participants: {
            select: {
              student: {
                select: {
                  registerNumber: true,
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.odRequest.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }

  /**
   * Approves an OD request. Enforces strict state machine transitions.
   */
  async approve(
    requestId: string,
    dto: OdActionDto,
    currentUser: JwtPayload,
  ) {
    return this.processAction(requestId, 'APPROVED', dto, currentUser);
  }

  /**
   * Rejects an OD request. Enforces strict state machine transitions.
   */
  async reject(
    requestId: string,
    dto: OdActionDto,
    currentUser: JwtPayload,
  ) {
    return this.processAction(requestId, 'REJECTED', dto, currentUser);
  }

  /**
   * Core approval/rejection logic with strict state machine validation.
   */
  private async processAction(
    requestId: string,
    action: 'APPROVED' | 'REJECTED',
    dto: OdActionDto,
    currentUser: JwtPayload,
  ) {
    // 1. Fetch the OD request
    const odRequest = await this.prisma.odRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          select: {
            userId: true,
            user: { select: { name: true } },
          },
        },
        batch: {
          select: {
            id: true,
            collegeId: true,
            departmentId: true,
            tutorId: true,
          },
        },
      },
    });

    if (!odRequest) {
      throw new NotFoundException('OD request not found');
    }

    // 2. College isolation check
    if (
      currentUser.role !== Role.SUPER_ADMIN &&
      odRequest.collegeId !== currentUser.collegeId
    ) {
      throw new ForbiddenException('Access denied to this OD request');
    }

    // 3. Determine the approver's role in this context
    let approvalRole: ApprovalRole;

    if (
      currentUser.role === Role.STAFF &&
      currentUser.isTutor &&
      odRequest.status === OdStatus.PENDING_TUTOR
    ) {
      // Verify tutor is assigned to this batch
      const mapping = await this.prisma.staffBatchMapping.findFirst({
        where: {
          staffId: currentUser.userId,
          batchId: odRequest.batchId,
          roleType: StaffBatchRoleType.TUTOR,
        },
      });

      if (!mapping) {
        throw new ForbiddenException(
          'You are not the tutor of this batch',
        );
      }

      approvalRole = ApprovalRole.TUTOR;
    } else if (
      currentUser.role === Role.HOD &&
      odRequest.status === OdStatus.PENDING_HOD
    ) {
      // Verify HOD's department matches the batch's department
      if (odRequest.batch.departmentId !== currentUser.departmentId) {
        throw new ForbiddenException(
          'This batch is not in your department',
        );
      }

      approvalRole = ApprovalRole.HOD;
    } else {
      throw new BadRequestException(
        `Cannot ${action.toLowerCase()} request with status "${odRequest.status}"`,
      );
    }

    // 4. Validate state transition
    const transitionKey = `${odRequest.status}_${action}`;
    const newStatus = VALID_TRANSITIONS[transitionKey];

    if (!newStatus) {
      throw new BadRequestException(
        `Invalid state transition: ${odRequest.status} → ${action}`,
      );
    }

    // 5. Determine new current level
    const newCurrentLevel =
      newStatus === OdStatus.PENDING_HOD
        ? ApprovalRole.HOD
        : odRequest.currentLevel;

    // 6. Execute in a transaction
    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      // Create approval record
      await tx.odApproval.create({
        data: {
          odRequestId: requestId,
          approvedBy: currentUser.userId,
          role: approvalRole,
          status:
            action === 'APPROVED'
              ? OdApprovalStatus.APPROVED
              : OdApprovalStatus.REJECTED,
          remark: dto.remark ?? null,
        },
      });

      // Update OD request status
      return tx.odRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          currentLevel: newCurrentLevel,
        },
        select: {
          id: true,
          status: true,
          currentLevel: true,
        },
      });
    });

    // 7. Send notifications (outside transaction — non-critical)
    await this.sendNotifications(
      odRequest,
      newStatus,
      currentUser.collegeId!,
      dto.remark ?? null,
    );

    this.logger.log(
      `OD request ${requestId} ${action} by ${currentUser.role} ${currentUser.userId}. New status: ${newStatus}`,
    );

    return updatedRequest;
  }

  /**
   * Sends notifications based on the OD status transition.
   * Ensures every stakeholder (student, tutor, HOD) is notified at the right time.
   */
  private async sendNotifications(
    odRequest: any,
    newStatus: OdStatus,
    collegeId: string,
    remark: string | null,
  ) {
    const studentName = odRequest.student.user?.name ?? 'A student';
    const subject = odRequest.subject;
    const remarkSuffix = remark ? `\n\nRemark: "${remark}"` : '';

    try {
      switch (newStatus) {
        // ─── Tutor approved → notify Student + HOD ───────────────
        case OdStatus.PENDING_HOD: {
          // 1. Notify Student — their request is progressing
          await this.notificationsService.create({
            userId: odRequest.student.userId,
            collegeId,
            title: '✅ OD Approved by Tutor',
            message: `Your OD request for "${subject}" has been approved by your tutor and is now pending HOD approval.${remarkSuffix}`,
          });

          // 2. Notify HOD — new request awaiting their review
          const hod = await this.prisma.user.findFirst({
            where: {
              collegeId,
              departmentId: odRequest.batch.departmentId,
              role: Role.HOD,
              isActive: true,
            },
            select: { id: true },
          });

          if (hod) {
            await this.notificationsService.create({
              userId: hod.id,
              collegeId,
              title: '📋 OD Awaiting Your Approval',
              message: `${studentName}'s OD request for "${subject}" has been approved by tutor and needs your review.`,
            });
          }
          break;
        }

        // ─── Tutor rejected → notify Student ─────────────────────
        case OdStatus.REJECTED_BY_TUTOR: {
          await this.notificationsService.create({
            userId: odRequest.student.userId,
            collegeId,
            title: '❌ OD Rejected by Tutor',
            message: `Your OD request for "${subject}" has been rejected by your tutor.${remarkSuffix}`,
          });
          break;
        }

        // ─── HOD approved → notify Student + Tutor ───────────────
        case OdStatus.APPROVED: {
          // 1. Notify Student — final approval
          await this.notificationsService.create({
            userId: odRequest.student.userId,
            collegeId,
            title: '🎉 OD Fully Approved',
            message: `Great news! Your OD request for "${subject}" has been approved by HOD. You're all set!`,
          });

          // 2. Notify Tutor — HOD approved the request they forwarded
          if (odRequest.batch.tutorId) {
            await this.notificationsService.create({
              userId: odRequest.batch.tutorId,
              collegeId,
              title: '✅ OD Approved by HOD',
              message: `${studentName}'s OD request for "${subject}" has been approved by HOD.`,
            });
          }
          break;
        }

        // ─── HOD rejected → notify Student + Tutor ───────────────
        case OdStatus.REJECTED_BY_HOD: {
          // 1. Notify Student — HOD rejected
          await this.notificationsService.create({
            userId: odRequest.student.userId,
            collegeId,
            title: '❌ OD Rejected by HOD',
            message: `Your OD request for "${subject}" has been rejected by HOD.${remarkSuffix}`,
          });

          // 2. Notify Tutor — HOD rejected the request they forwarded
          if (odRequest.batch.tutorId) {
            await this.notificationsService.create({
              userId: odRequest.batch.tutorId,
              collegeId,
              title: '❌ OD Rejected by HOD',
              message: `${studentName}'s OD request for "${subject}" has been rejected by HOD.${remarkSuffix}`,
            });
          }
          break;
        }
      }
    } catch (error) {
      // Notification failure should not break the approval flow
      this.logger.error(
        `Failed to send notification for OD ${odRequest.id}`,
        error,
      );
    }
  }
}
