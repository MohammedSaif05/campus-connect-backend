import { Module } from '@nestjs/common';
import { OdController } from './od.controller.js';
import { OdService } from './od.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [OdController],
  providers: [OdService],
})
export class OdModule {}
