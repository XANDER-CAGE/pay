import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { HumoProcessingService } from './humo.processing.service';
import { DecryptModule } from '../decrypt/decrypt.module';
import { BINS_SYMBOL, bins } from 'src/common/parsedCache/parsedCache.bins';
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
    {
      provide: BINS_SYMBOL,
      useValue: bins,
    },
  ],
  exports: [ProcessingService],
})
export class ProcessingModule {}
