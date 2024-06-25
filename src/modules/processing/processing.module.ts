import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { HumoProcessingService } from './humo.processing.service';
import { DecryptModule } from '../decrypt/decrypt.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UzcardProcessingService } from './uzcard.processing.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [DecryptModule, PrismaModule, NotificationModule],
  controllers: [],
  providers: [
    ProcessingService,
    HumoProcessingService,
    UzcardProcessingService,
  ],
  exports: [ProcessingService],
})
export class ProcessingModule {}
