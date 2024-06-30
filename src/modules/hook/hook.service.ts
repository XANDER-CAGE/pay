import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { HookDto } from './dto/hook.dto';
import { hookQueueServiceName } from '../queue/queues/hook.queue';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { IHookResponse } from './interface/hookResponse.interface';
import { hookQueuePattern } from '../queue/patterns/queue.patterns';

@Injectable()
export class HookService {
  hookQueuePattern: string;
  constructor(
    @Inject(hookQueueServiceName) private readonly hookQueue: ClientProxy,
  ) {
    this.hookQueuePattern = hookQueuePattern;
  }
  async hook(data: HookDto): Promise<IHookResponse> {
    const { HookUrl, ...hookData } = data;
    try {
      const response = await axios.post(HookUrl, hookData);
      return {
        success: true,
        code: response.data.code,
      };
    } catch (error) {
      return {
        success: false,
        code: NaN,
      };
    }
  }

  async sendToHookQueue(data: HookDto) {
    return await firstValueFrom(
      this.hookQueue.send(this.hookQueuePattern, data),
    );
  }
}
