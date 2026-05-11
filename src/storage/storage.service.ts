import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'campus-connect';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn('R2 credentials are not fully configured. File uploads will fail.');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  /**
   * Uploads a file buffer to Cloudflare R2 and returns the public URL.
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folderPath: string,
  ): Promise<string> {
    try {
      const extension = path.extname(originalName) || '.bin';
      const uniqueName = `${crypto.randomUUID()}${extension}`;
      const key = `${folderPath}/${uniqueName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      // If a public URL base is configured, use it. Otherwise construct a generic one.
      if (this.publicUrl) {
        // Ensure trailing slash
        const baseUrl = this.publicUrl.endsWith('/') ? this.publicUrl : `${this.publicUrl}/`;
        return `${baseUrl}${key}`;
      }
      
      // Fallback relative path if no public URL
      return `/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file to R2: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }
}
