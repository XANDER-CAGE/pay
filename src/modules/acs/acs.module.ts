import { Module } from '@nestjs/common';
import { AcsService } from './acs.service';
import { AcsController } from './acs.controller';

@Module({
  controllers: [AcsController],
  providers: [AcsService],
})
export class AcsModule {}
