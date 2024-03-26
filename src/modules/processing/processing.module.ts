import { Module } from '@nestjs/common';
import { ProcessingService } from './processing.service';
import { SendSmsWithPlayMobile } from 'src/common/utils/smsSender.util';
import { HumoProcessingService } from './humoProcessing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UzCardProcessingService } from './uzCardProcessing.service';
import { DecryptModule } from '../decrypt/decrypt.module';

@Module({
  imports: [PrismaModule, DecryptModule],
  controllers: [],
  providers: [
    ProcessingService,
    HumoProcessingService,
    UzCardProcessingService,
    DecryptModule,
    {
      provide: SendSmsWithPlayMobile,
      useClass: SendSmsWithPlayMobile,
    },
  ],
  exports: [ProcessingService],
})
export class ProcessingModule {}
