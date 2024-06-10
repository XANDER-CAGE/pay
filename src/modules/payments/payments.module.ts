import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { getLocationProvider } from 'src/common/utils/getGeoLocation.util';
import { DecryptModule } from '../decrypt/decrypt.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessingModule } from '../processing/processing.module';
import { CardsModule } from '../cards/cards.module';
import { HookModule } from '../hook/hook.module';
import { PaymentsTESTService } from './payments.test.service';
import { NotificationModule } from '../notification/notification.module';

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
})
export class PaymentsModule {}
