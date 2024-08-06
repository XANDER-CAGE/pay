import { Injectable } from '@nestjs/common';
import { card, transaction } from '@prisma/client';
import axios from 'axios';
import { HookDto, OperationType } from './dto/hook.dto';

interface HookResponse {
  success: boolean;
  code: number;
}

@Injectable()
export class HookService {
  async hook(
    webhookUrl: string,
    operationType: OperationType,
    transaction: transaction,
    card: card,
    jsonData?: any,
  ): Promise<HookResponse> {
    const dto = new HookDto(transaction, card, operationType, jsonData);
    try {
      console.log('HOOK DTO', dto);
      const response = await axios.post(webhookUrl, dto);
      console.log('RESPONSE FROM HOOK', response);
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
}
