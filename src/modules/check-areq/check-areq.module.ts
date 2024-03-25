import { Module } from '@nestjs/common';
import { CheckAreqService } from './check-areq.service';
import { CheckAreqController } from './check-areq.controller';

@Module({
  controllers: [CheckAreqController],
  providers: [CheckAreqService],
})
export class CheckAreqModule {}
