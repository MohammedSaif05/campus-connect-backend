import { Module } from '@nestjs/common';
import { BulkUploadController } from './bulk-upload.controller.js';
import { BulkUploadService } from './bulk-upload.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
})
export class BulkUploadModule {}
