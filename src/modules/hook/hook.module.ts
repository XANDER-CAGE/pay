import { Module } from '@nestjs/common';
import { HookService } from './hook.service';
import { hookQueue } from '../queue/queues/hook.queue';

@Module({
  imports: [hookQueue],
  providers: [HookService],
  exports: [HookService],
})
export class HookModule {}
