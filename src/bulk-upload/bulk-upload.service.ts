import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import {
  parseCsv,
  findDuplicates,
  CsvValidationError,
} from '../common/utils/csv-parser.util.js';

export interface StaffCsvRow {
  name: string;
  email: string;
  is_tutor?: string;
}

export interface StudentCsvRow {
  name: string;
  email: string;
  register_number: string;
  dob: string;
  batch_id: string;
}

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Parses and validates a staff CSV file. Returns preview data.
   */
  async previewStaffUpload(buffer: Buffer, currentUser: JwtPayload) {
    this.validateHod(currentUser);

    const { data, errors } = parseCsv<StaffCsvRow>(buffer, [
      'name',
      'email',
    ]);

    // Check for duplicates within the file
    const duplicateErrors = findDuplicates(data, 'email');
    errors.push(...duplicateErrors);

    // Check for existing emails in the database
    const dbErrors = await this.checkExistingEmails(
      data.map((r) => r.email),
      currentUser.collegeId!,
    );
    errors.push(...dbErrors);

    return {
      totalRows: data.length,
      validRows: data.length - errors.length,
      errors,
      preview: data.slice(0, 10), // Show first 10 rows
    };
  }

  /**
   * Confirms and inserts staff from a CSV file.
   */
  async confirmStaffUpload(buffer: Buffer, currentUser: JwtPayload) {
    this.validateHod(currentUser);

    const { data, errors } = parseCsv<StaffCsvRow>(buffer, [
      'name',
      'email',
    ]);

    const duplicateErrors = findDuplicates(data, 'email');
    errors.push(...duplicateErrors);

    const dbErrors = await this.checkExistingEmails(
      data.map((r) => r.email),
      currentUser.collegeId!,
    );
    errors.push(...dbErrors);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed. Fix errors and re-upload.',
        errors,
      });
    }

    // Bulk insert within a transaction
    const results = await this.prisma.$transaction(async () => {
      const created: any[] = [];

      for (const row of data) {
        const defaultPassword = row.email.split('@')[0] + '@123';
        const user = await this.usersService.create({
          name: row.name,
          email: row.email,
          password: defaultPassword,
          role: Role.STAFF,
          collegeId: currentUser.collegeId!,
          departmentId: currentUser.departmentId!,
          isTutor: row.is_tutor?.toLowerCase() === 'true',
          mustChangePassword: true,
        });
        created.push(user);
      }

      return created;
    });

    this.logger.log(
      `Bulk uploaded ${results.length} staff by HOD ${currentUser.userId}`,
    );

    return {
      message: `${results.length} staff members created successfully`,
      count: results.length,
    };
  }

  /**
   * Parses and validates a student CSV file. Returns preview data.
   */
  async previewStudentUpload(buffer: Buffer, currentUser: JwtPayload) {
    this.validateHod(currentUser);

    const { data, errors } = parseCsv<StudentCsvRow>(buffer, [
      'name',
      'email',
      'register_number',
      'dob',
      'batch_id',
    ]);

    const emailDuplicates = findDuplicates(data, 'email');
    const regDuplicates = findDuplicates(data, 'register_number');
    errors.push(...emailDuplicates, ...regDuplicates);

    // Check for existing emails
    const dbEmailErrors = await this.checkExistingEmails(
      data.map((r) => r.email),
      currentUser.collegeId!,
    );
    errors.push(...dbEmailErrors);

    // Check for existing register numbers
    const dbRegErrors = await this.checkExistingRegNumbers(
      data.map((r) => r.register_number),
      currentUser.collegeId!,
    );
    errors.push(...dbRegErrors);

    return {
      totalRows: data.length,
      validRows: data.length - errors.length,
      errors,
      preview: data.slice(0, 10),
    };
  }

  /**
   * Confirms and inserts students from a CSV file.
   */
  async confirmStudentUpload(buffer: Buffer, currentUser: JwtPayload) {
    this.validateHod(currentUser);

    const { data, errors } = parseCsv<StudentCsvRow>(buffer, [
      'name',
      'email',
      'register_number',
      'dob',
      'batch_id',
    ]);

    const emailDuplicates = findDuplicates(data, 'email');
    const regDuplicates = findDuplicates(data, 'register_number');
    errors.push(...emailDuplicates, ...regDuplicates);

    const dbEmailErrors = await this.checkExistingEmails(
      data.map((r) => r.email),
      currentUser.collegeId!,
    );
    const dbRegErrors = await this.checkExistingRegNumbers(
      data.map((r) => r.register_number),
      currentUser.collegeId!,
    );
    errors.push(...dbEmailErrors, ...dbRegErrors);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed. Fix errors and re-upload.',
        errors,
      });
    }

    // Validate all batch IDs exist in the college
    const batchIds = [...new Set(data.map((r) => r.batch_id))];
    const validBatches = await this.prisma.batch.findMany({
      where: { id: { in: batchIds }, collegeId: currentUser.collegeId! },
      select: { id: true },
    });
    const validBatchIds = new Set(validBatches.map((b) => b.id));

    for (const batchId of batchIds) {
      if (!validBatchIds.has(batchId)) {
        throw new BadRequestException(
          `Batch ID "${batchId}" not found in your college`,
        );
      }
    }

    // Bulk insert within a transaction
    const results = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];

      for (const row of data) {
        const user = await this.usersService.create({
          name: row.name,
          email: row.email,
          password: row.dob, // DOB as default password (hashed by UsersService)
          role: Role.STUDENT,
          collegeId: currentUser.collegeId!,
          mustChangePassword: true,
        });

        const student = await tx.student.create({
          data: {
            userId: user.id,
            collegeId: currentUser.collegeId!,
            registerNumber: row.register_number,
            batchId: row.batch_id,
          },
        });

        created.push({ ...user, student });
      }

      return created;
    });

    this.logger.log(
      `Bulk uploaded ${results.length} students by HOD ${currentUser.userId}`,
    );

    return {
      message: `${results.length} students created successfully`,
      count: results.length,
    };
  }

  private validateHod(currentUser: JwtPayload): void {
    if (
      currentUser.role !== Role.HOD ||
      !currentUser.collegeId ||
      !currentUser.departmentId
    ) {
      throw new ForbiddenException(
        'Only HODs with a college and department can perform bulk uploads',
      );
    }
  }

  private async checkExistingEmails(
    emails: string[],
    collegeId: string,
  ): Promise<CsvValidationError[]> {
    const errors: CsvValidationError[] = [];

    const existingUsers = await this.prisma.user.findMany({
      where: { collegeId, email: { in: emails } },
      select: { email: true },
    });

    const existingSet = new Set(existingUsers.map((u) => u.email));

    emails.forEach((email, index) => {
      if (existingSet.has(email)) {
        errors.push({
          row: index + 2,
          field: 'email',
          message: `Email "${email}" already exists in this college`,
        });
      }
    });

    return errors;
  }

  private async checkExistingRegNumbers(
    regNumbers: string[],
    collegeId: string,
  ): Promise<CsvValidationError[]> {
    const errors: CsvValidationError[] = [];

    const existing = await this.prisma.student.findMany({
      where: { collegeId, registerNumber: { in: regNumbers } },
      select: { registerNumber: true },
    });

    const existingSet = new Set(existing.map((s) => s.registerNumber));

    regNumbers.forEach((regNum, index) => {
      if (existingSet.has(regNum)) {
        errors.push({
          row: index + 2,
          field: 'register_number',
          message: `Register number "${regNum}" already exists in this college`,
        });
      }
    });

    return errors;
  }
}
