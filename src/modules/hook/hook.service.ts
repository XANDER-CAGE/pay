import { Injectable } from '@nestjs/common';
import { card, payment } from '@prisma/client';
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
    payment: payment,
    card: card,
  ): Promise<HookResponse> {
    const dto = new HookDto(payment, card, operationType);
    try {
      const response = await axios.post(webhookUrl, dto);
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

  // async pay(
  //   webhookUrl: string,
  //   payment: payment,
  //   card: card,
  // ): Promise<HookResponse> {
  //   const dto = new HookDto(payment, card, 'Payment');
  //   try {
  //     const response = await axios.post(webhookUrl + '/pay', dto);
  //     return {
  //       success: true,
  //       code: response.data.code,
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       code: NaN,
  //     };
  //   }
  // }

  // async confirm(
  //   webhookUrl: string,
  //   payment: payment,
  //   card: card,
  // ): Promise<HookResponse> {
  //   const dto = new HookDto(payment, card, 'Payment');
  //   try {
  //     const response = await axios.post(webhookUrl + '/confirm', dto);
  //     return {
  //       success: true,
  //       code: response.data.code,
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       code: NaN,
  //     };
  //   }
  // }

  // async refund(
  //   webhookUrl: string,
  //   payment: payment,
  //   card: card,
  // ): Promise<HookResponse> {
  //   const dto = new HookDto(payment, card, 'Refund');
  //   try {
  //     const response = await axios.post(webhookUrl + '/refund', dto);
  //     return {
  //       success: true,
  //       code: response.data.code,
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       code: NaN,
  //     };
  //   }
  // }

  // async recurrent(webhookUrl: string) {}
}
