import { Module } from '@nestjs/common';
import { getLocationProvider } from 'src/common/utils/getGeoLocation.util';
import { CardsModule } from '../cards/cards.module';
import { DecryptModule } from '../decrypt/decrypt.module';
import { HookModule } from '../hook/hook.module';
import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessingModule } from '../processing/processing.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsTESTService } from './payments.test.service';

@Module({
  imports: [
    DecryptModule,
    PrismaModule,
    ProcessingModule,
    CardsModule,
    HookModule,
    NotificationModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, getLocationProvider, PaymentsTESTService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
