import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { BulkUploadService } from './bulk-upload.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@Controller('bulk-upload')
@Roles(Role.HOD)
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  @Post('staff/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewStaff(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    this.validateFile(file);
    return this.bulkUploadService.previewStaffUpload(file.buffer, user);
  }

  @Post('staff/confirm')
  @UseInterceptors(FileInterceptor('file'))
  confirmStaff(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    this.validateFile(file);
    return this.bulkUploadService.confirmStaffUpload(file.buffer, user);
  }

  @Post('students/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewStudents(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    this.validateFile(file);
    return this.bulkUploadService.previewStudentUpload(file.buffer, user);
  }

  @Post('students/confirm')
  @UseInterceptors(FileInterceptor('file'))
  confirmStudents(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    this.validateFile(file);
    return this.bulkUploadService.confirmStudentUpload(file.buffer, user);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are supported');
    }
  }
}
