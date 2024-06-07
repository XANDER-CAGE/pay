import { Module } from '@nestjs/common';
import { BinsService } from './bins.service';
import { BinsController } from './bins.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CronModule } from '../cron/cron.module';

@Module({
  imports: [PrismaModule, CronModule],
  controllers: [BinsController],
  providers: [BinsService],
})
export class BinsModule {}
