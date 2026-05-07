import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

// Feature modules
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CollegesModule } from './colleges/colleges.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { StaffModule } from './staff/staff.module.js';
import { BatchesModule } from './batches/batches.module.js';
import { StudentsModule } from './students/students.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { TimetableModule } from './timetable/timetable.module.js';
import { OdModule } from './od/od.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { BulkUploadModule } from './bulk-upload/bulk-upload.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    // Global config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Database
    PrismaModule,

    // Auth
    AuthModule,

    // Core modules
    UsersModule,
    CollegesModule,
    DepartmentsModule,
    StaffModule,
    BatchesModule,
    StudentsModule,
    SubjectsModule,
    TimetableModule,

    // OD workflow
    OdModule,
    NotificationsModule,

    // Utilities
    BulkUploadModule,

    // Health check & self-ping (keeps Render awake)
    HealthModule,
  ],
  providers: [
    // Global JWT guard — all routes require auth unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Global roles guard — checks @Roles() metadata
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
