import { Module } from '@nestjs/common';
import { HookService } from './hook.service';
import { HookController } from './hook.controller';
import { WebhookLoggingService } from './webhook-logging.service';
import { HookTestService } from './hook.test.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HookController],
  providers: [
    HookService, 
    WebhookLoggingService, 
    HookTestService
  ],
  exports: [
    HookService, 
    WebhookLoggingService, 
    HookTestService
  ],
})
export class HookModule {}