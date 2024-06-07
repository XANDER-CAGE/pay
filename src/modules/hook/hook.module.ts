import { Module } from '@nestjs/common';
import { HookService } from './hook.service';

@Module({
  controllers: [],
  providers: [HookService],
  exports: [HookService],
})
export class HookModule {}
