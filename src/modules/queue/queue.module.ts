import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { HookModule } from '../hook/hook.module';

@Module({
  imports: [HookModule],
  controllers: [QueueController],
})
export class QueueModule {}
