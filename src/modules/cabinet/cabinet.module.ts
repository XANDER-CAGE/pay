import { Module } from '@nestjs/common';
import { CabinetService } from './cabinet.service';
import { CabinetController } from './cabinet.controller';

@Module({
  controllers: [CabinetController],
  providers: [CabinetService]
})
export class CabinetModule {}
