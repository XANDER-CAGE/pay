import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { HookDto } from '../hook/dto/hook.dto';
import { IHookResponse } from '../hook/interface/hookResponse.interface';
import { HookService } from '../hook/hook.service';
import { hookQueuePattern } from './patterns/queue.patterns';

@Controller()
export class QueueController {
  constructor(private readonly hookService: HookService) {}

  @MessagePattern(hookQueuePattern)
  async create(
    @Payload() hookDto: HookDto,
    @Ctx() ctx: RmqContext,
  ): Promise<IHookResponse> {
    const channel = ctx.getChannelRef();
    const data = ctx.getMessage();
    const resFromHook = await this.hookService.hook(hookDto);
    if (resFromHook.success) {
      channel.ack(data);
      return resFromHook;
    }
  }
}
