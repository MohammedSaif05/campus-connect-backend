import { Module } from '@nestjs/common';
import { HackathonsController } from './hackathons.controller.js';
import { HackathonsService } from './hackathons.service.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [HackathonsController],
  providers: [HackathonsService],
})
export class HackathonsModule {}
