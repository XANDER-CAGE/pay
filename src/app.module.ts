import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BinsModule } from './modules/bins/bins.module';
import { CabinetModule } from './modules/cabinet/cabinet.module';
import { CardsModule } from './modules/cards/cards.module';
import { CronModule } from './modules/cron/cron.module';
import { DecryptModule } from './modules/decrypt/decrypt.module';
import { HomeModule } from './modules/home/home.module';
import { HookModule } from './modules/hook/hook.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { ReceiptModule } from './modules/receipt/receipt.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 1000 * 60 * 60,
    }),
    PaymentsModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    DecryptModule,
    PrismaModule,
    ProcessingModule,
    HomeModule,
    NotificationModule,
    CronModule,
    BinsModule,
    CardsModule,
    HookModule,
    OrdersModule,
    CabinetModule,
    ReceiptModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
