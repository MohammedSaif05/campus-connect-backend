import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const appUrl = this.config.get<string>('RENDER_EXTERNAL_URL') ||
                   this.config.get<string>('APP_URL');

    if (!appUrl) {
      this.logger.warn('No RENDER_EXTERNAL_URL or APP_URL set — self-ping disabled');
      return;
    }

    const pingUrl = `${appUrl}/api/v1/health`;
    const interval = 40_000; // 40 seconds

    this.logger.log(`Self-ping enabled → ${pingUrl} every ${interval / 1000}s`);

    this.intervalId = setInterval(async () => {
      try {
        const res = await fetch(pingUrl);
        this.logger.debug(`Self-ping → ${res.status}`);
      } catch (err) {
        this.logger.warn(`Self-ping failed: ${(err as Error).message}`);
      }
    }, interval);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Self-ping stopped');
    }
  }
}
