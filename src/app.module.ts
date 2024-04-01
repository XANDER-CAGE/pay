import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { BinsModule } from './modules/bins/bins.module';
import { AcsModule } from './modules/acs/acs.module';
import { DecryptModule } from './modules/decrypt/decrypt.module';
import { CheckAreqModule } from './modules/check-areq/check-areq.module';
import { ValidateModule } from './modules/validate/validate.module';
import { CardsModule } from './modules/cards/cards.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PaymentsModule,
    ProcessingModule,
    BinsModule,
    AcsModule,
    DecryptModule,
    CheckAreqModule,
    ValidateModule,
    CardsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
