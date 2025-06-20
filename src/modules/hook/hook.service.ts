import { Injectable } from '@nestjs/common';
import { card, transaction, ip } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  BaseHookDto,
  CheckHookDto,
  PayHookDto,
  FailHookDto,
  ConfirmHookDto,
  RefundHookDto,
  CancelHookDto,
  RecurrentHookDto,
} from './dto/hook.dto';

export type HookType = 'check' | 'pay' | 'fail' | 'confirm' | 'refund' | 'cancel' | 'recurrent';

interface HookResponse {
  success: boolean;
  code: number;
  message?: string;
}

interface HookRetryConfig {
  maxAttempts: number;
  retryIntervals: number[]; // в минутах: [1, 2, 5, 10, 30]
  timeout: number; // 30 секунд
}

@Injectable()
export class HookService {
  private readonly retryConfig: HookRetryConfig = {
    maxAttempts: 100,
    retryIntervals: [1, 2, 5, 10, 30], // интервалы
    timeout: 30000, // 30 секунд
  };

  /**
   * Отправка уведомления с автоматическими повторными попытками
   */
  async sendHook(
    webhookUrl: string,
    hookType: HookType,
    apiSecret: string,
    transaction: transaction,
    card?: card,
    ip?: ip,
    jsonData?: any,
    originalTransaction?: transaction,
    subscriptionData?: any,
  ): Promise<HookResponse> {
    const dto = this.createHookDto(hookType, transaction, card, ip, jsonData, originalTransaction, subscriptionData);
    
    return this.sendWithRetry(webhookUrl, dto, apiSecret, 1);
  }

  /**
   * Создание DTO в зависимости от типа уведомления
   */
  private createHookDto(
    hookType: HookType,
    transaction: transaction,
    card?: card,
    ip?: ip,
    jsonData?: any,
    originalTransaction?: transaction,
    subscriptionData?: any,
  ): any {
    switch (hookType) {
      case 'check':
        return new CheckHookDto(transaction, card, ip, jsonData);
      case 'pay':
        return new PayHookDto(transaction, card, ip, jsonData);
      case 'fail':
        return new FailHookDto(transaction, card, ip, jsonData);
      case 'confirm':
        return new ConfirmHookDto(transaction, card, ip, jsonData);
      case 'refund':
        if (!originalTransaction) {
          throw new Error('Original transaction required for refund hook');
        }
        return new RefundHookDto(transaction, originalTransaction, jsonData);
      case 'cancel':
        return new CancelHookDto(transaction, jsonData);
      case 'recurrent':
        if (!subscriptionData) {
          throw new Error('Subscription data required for recurrent hook');
        }
        return new RecurrentHookDto(subscriptionData);
      default:
        throw new Error(`Unsupported hook type: ${hookType}`);
    }
  }

  /**
   * Отправка с повторными попытками согласно документации
   */
  private async sendWithRetry(
    webhookUrl: string,
    dto: any,
    apiSecret: string,
    attempt: number,
  ): Promise<HookResponse> {
    try {
      const result = await this.makeRequest(webhookUrl, dto, apiSecret);
      
      // Если успешно или код ответа = 0, прекращаем попытки
      if (result.success && result.code === 0) {
        console.log(`Hook delivered successfully on attempt ${attempt}`, {
          url: webhookUrl,
          transactionId: dto.TransactionId,
          attempt,
        });
        return result;
      }

      // Если неуспешно и есть еще попытки
      if (attempt < this.retryConfig.maxAttempts) {
        const delayMinutes = this.getRetryDelay(attempt);
        console.log(`Hook failed, retrying in ${delayMinutes} minutes`, {
          url: webhookUrl,
          transactionId: dto.TransactionId,
          attempt,
          code: result.code,
        });
        
        // Планируем повторную попытку
        setTimeout(() => {
          this.sendWithRetry(webhookUrl, dto, apiSecret, attempt + 1);
        }, delayMinutes * 60 * 1000);
      } else {
        console.error(`Hook failed after ${this.retryConfig.maxAttempts} attempts`, {
          url: webhookUrl,
          transactionId: dto.TransactionId,
        });
      }

      return result;
    } catch (error) {
      console.error(`Hook attempt ${attempt} failed with error:`, {
        url: webhookUrl,
        transactionId: dto.TransactionId,
        error: error.message,
      });

      if (attempt < this.retryConfig.maxAttempts) {
        const delayMinutes = this.getRetryDelay(attempt);
        setTimeout(() => {
          this.sendWithRetry(webhookUrl, dto, apiSecret, attempt + 1);
        }, delayMinutes * 60 * 1000);
      }

      return {
        success: false,
        code: NaN,
        message: error.message,
      };
    }
  }

  /**
   * Выполнение HTTP запроса с HMAC подписью
   */
  private async makeRequest(
    webhookUrl: string,
    dto: any,
    apiSecret: string,
  ): Promise<HookResponse> {
    const body = JSON.stringify(dto);
    const hmacHeaders = this.generateHmacHeaders(body, apiSecret);

    const response = await axios.post(webhookUrl, dto, {
      headers: {
        'Content-Type': 'application/json',
        'X-Content-HMAC': hmacHeaders.xContentHmac,
        'Content-HMAC': hmacHeaders.contentHmac,
      },
      timeout: this.retryConfig.timeout,
      validateStatus: () => true, // Не бросать ошибку для любого статуса
    });

    // Проверяем структуру ответа
    let code = NaN;
    if (response.data && typeof response.data.code !== 'undefined') {
      code = parseInt(response.data.code, 10);
    }

    const success = response.status >= 200 && response.status < 300 && code === 0;

    return {
      success,
      code,
      message: response.data?.message || `HTTP ${response.status}`,
    };
  }

  /**
   * Генерация HMAC заголовков
   */
  private generateHmacHeaders(body: string, apiSecret: string): {
    xContentHmac: string;
    contentHmac: string;
  } {
    // X-Content-HMAC - из обычного тела запроса
    const xContentHmac = crypto
      .createHmac('sha256', apiSecret)
      .update(body, 'utf8')
      .digest('base64');

    // Content-HMAC - из URL encoded тела (на случай если сервер ожидает именно такой)
    const encodedBody = encodeURIComponent(body);
    const contentHmac = crypto
      .createHmac('sha256', apiSecret)
      .update(encodedBody, 'utf8')
      .digest('base64');

    return {
      xContentHmac,
      contentHmac,
    };
  }

  /**
   * Получение интервала для повторной попытки
   */
  private getRetryDelay(attempt: number): number {
    const intervals = this.retryConfig.retryIntervals;
    const index = Math.min(attempt - 1, intervals.length - 1);
    return intervals[index];
  }

  /**
   * Проверка HMAC подписи входящего webhook (для обратной совместимости)
   */
  verifyHmacSignature(
    body: string,
    signature: string,
    apiSecret: string,
    isUrlEncoded: boolean = false,
  ): boolean {
    try {
      const dataToVerify = isUrlEncoded ? encodeURIComponent(body) : body;
      const expectedSignature = crypto
        .createHmac('sha256', apiSecret)
        .update(dataToVerify, 'utf8')
        .digest('base64');

      return expectedSignature === signature;
    } catch (error) {
      console.error('HMAC verification failed:', error);
      return false;
    }
  }

  /**
   * Устаревший метод для обратной совместимости
   * @deprecated Используйте sendHook вместо hook
   */
  async hook(
    webhookUrl: string,
    operationType: 'Payment' | 'Refund' | 'CardPayout',
    transaction: transaction,
    card: card,
    jsonData?: any,
  ): Promise<HookResponse> {
    // Определяем тип hook-а на основе operationType и статуса
    let hookType: HookType;
    if (operationType === 'Refund') {
      hookType = 'refund';
    } else if (transaction.status === 'Completed') {
      hookType = 'pay';
    } else if (transaction.status === 'Declined') {
      hookType = 'fail';
    } else {
      hookType = 'check';
    }

    // Для старого метода используем пустой API secret (нужно исправить в коде)
    return this.sendHook(webhookUrl, hookType, '', transaction, card, undefined, jsonData);
  }
}