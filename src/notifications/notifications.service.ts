import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import {
  getPrismaPageParams,
  paginatedResponse,
} from '../common/utils/pagination.util.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a notification. Called from other services (e.g., OD service).
   * NEVER call this from a controller directly.
   */
  async create(data: {
    userId: string;
    collegeId: string;
    title: string;
    message: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        collegeId: data.collegeId,
        title: data.title,
        message: data.message,
      },
    });

    this.logger.log(
      `Notification sent to user ${data.userId}: "${data.title}"`,
    );

    return notification;
  }

  /**
   * Lists notifications for the current user, scoped by college.
   */
  async findAll(
    userId: string,
    collegeId: string,
    query: PaginationQueryDto,
  ) {
    const where = { userId, collegeId };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        ...getPrismaPageParams(query),
        select: {
          id: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginatedResponse(data, total, query);
  }

  /**
   * Marks a notification as read. Enforces user ownership.
   */
  async markAsRead(notificationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    return { message: 'Notification marked as read' };
  }
}
