import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { WebhookCronService } from './webhook-cron.service';
import { HookModule } from '../hook/hook.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HookModule, PrismaModule],
  controllers: [],
  providers: [CronService, WebhookCronService],
})
export class CronModule {}