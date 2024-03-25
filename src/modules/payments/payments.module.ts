import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AntifraudService } from './antifraud.service';
import { LocationService } from './getGeoLocation.service';
import { ProcessingModule } from '../processing/processing.module';
import { DecryptModule } from '../decrypt/decrypt.module';

@Module({
  imports: [PrismaModule, ProcessingModule, DecryptModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, AntifraudService, LocationService],
})
export class PaymentsModule {}
