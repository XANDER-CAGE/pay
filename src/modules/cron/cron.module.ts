import { Module } from '@nestjs/common';
import { CronService } from './cron.service';

@Module({
  controllers: [],
  providers: [CronService],
})
export class CronModule {}
