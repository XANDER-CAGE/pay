// src/modules/hook/webhook-logging.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HookType = 'check' | 'pay' | 'fail' | 'confirm' | 'refund' | 'cancel' | 'recurrent';

interface WebhookLogData {
  hookId?: number;
  transactionId?: number;
  webhookType: HookType;
  url: string;
  requestBody: string;
  responseCode?: number;
  responseBody?: string;
  attemptNumber: number;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class WebhookLoggingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Логирование отправки webhook-а
   */
  async logWebhookAttempt(data: WebhookLogData): Promise<void> {
    try {
      // Предполагаем, что таблица называется webhook_log
      // Если у вас другое название - измените здесь
      await this.prisma.$executeRaw`
        INSERT INTO webhook_log (
          hook_id, transaction_id, webhook_type, url, request_body,
          response_code, response_body, attempt_number, success, error_message,
          created_at, updated_at
        ) VALUES (
          ${data.hookId}, ${data.transactionId}, ${data.webhookType}, ${data.url}, 
          ${data.requestBody}, ${data.responseCode}, ${data.responseBody}, 
          ${data.attemptNumber}, ${data.success}, ${data.errorMessage},
          NOW(), NOW()
        )
      `;
    } catch (error) {
      console.error('Failed to log webhook attempt:', error);
      // Не бросаем ошибку, чтобы не нарушить основной процесс
    }
  }

  /**
   * Получение статистики по webhook-ам за период
   */
  async getWebhookStats(cashboxId: number, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.$queryRaw`
      SELECT 
        wl.webhook_type,
        wl.success,
        COUNT(*) as count
      FROM webhook_log wl
      INNER JOIN hook h ON h.id = wl.hook_id
      WHERE h.cashbox_id = ${cashboxId}
        AND wl.created_at >= ${startDate}
      GROUP BY wl.webhook_type, wl.success
    `;

    // Преобразуем в удобный формат
    const result = {};
    (stats as any[]).forEach(stat => {
      if (!result[stat.webhook_type]) {
        result[stat.webhook_type] = { success: 0, failed: 0 };
      }
      if (stat.success) {
        result[stat.webhook_type].success = Number(stat.count);
      } else {
        result[stat.webhook_type].failed = Number(stat.count);
      }
    });

    return result;
  }

  /**
   * Получение неуспешных webhook-ов для повторной отправки
   */
  async getFailedWebhooks(maxAttempts: number = 100) {
    return this.prisma.$queryRaw`
      SELECT 
        wl.*,
        h.url as hook_url,
        h.type as hook_type,
        h.cashbox_id,
        t.id as transaction_id,
        t.status as transaction_status
      FROM webhook_log wl
      INNER JOIN hook h ON h.id = wl.hook_id
      LEFT JOIN transaction t ON t.id = wl.transaction_id
      WHERE wl.success = false
        AND wl.attempt_number < ${maxAttempts}
      ORDER BY wl.created_at ASC
      LIMIT 100
    `;
  }

  /**
   * Получение истории попыток для конкретной транзакции
   */
  async getTransactionWebhookHistory(transactionId: number) {
    return this.prisma.$queryRaw`
      SELECT 
        wl.*,
        h.type as hook_type,
        h.url as hook_url
      FROM webhook_log wl
      INNER JOIN hook h ON h.id = wl.hook_id
      WHERE wl.transaction_id = ${transactionId}
      ORDER BY wl.created_at DESC
    `;
  }

  /**
   * Получение последних неудачных webhook-ов
   */
  async getRecentFailures(cashboxId: number, limit: number = 50) {
    return this.prisma.$queryRaw`
      SELECT 
        wl.*,
        h.type as hook_type,
        h.url as hook_url,
        t.invoice_id,
        t.amount,
        t.status as transaction_status
      FROM webhook_log wl
      INNER JOIN hook h ON h.id = wl.hook_id
      LEFT JOIN transaction t ON t.id = wl.transaction_id
      WHERE h.cashbox_id = ${cashboxId}
        AND wl.success = false
      ORDER BY wl.created_at DESC
      LIMIT ${limit}
    `;
  }

  /**
   * Очистка старых логов (запускать по расписанию)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.$executeRaw`
      DELETE FROM webhook_log 
      WHERE created_at < ${cutoffDate}
    `;

    return Number(result);
  }

  /**
   * Получение общей статистики по webhook-ам
   */
  async getOverallStats(cashboxId: number) {
    const stats = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_attempts,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_attempts,
        COUNT(DISTINCT webhook_type) as webhook_types_used,
        AVG(attempt_number) as avg_attempts_per_webhook
      FROM webhook_log wl
      INNER JOIN hook h ON h.id = wl.hook_id
      WHERE h.cashbox_id = ${cashboxId}
        AND wl.created_at >= NOW() - INTERVAL '30 days'
    `;

    return (stats as any[])[0];
  }
}