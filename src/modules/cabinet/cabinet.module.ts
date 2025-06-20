import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HookModule } from '../hook/hook.module';
import { CabinetController } from './cabinet.controller';
import { CabinetService } from './cabinet.service';

@Module({
  imports: [PaymentsModule, PrismaModule, HookModule],
  controllers: [CabinetController],
  providers: [CabinetService],
})
export class CabinetModule {}