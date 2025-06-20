import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhookLoggingService } from '../hook/webhook-logging.service';
import { HookService } from '../hook/hook.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookCronService {
  constructor(
    private readonly webhookLoggingService: WebhookLoggingService,
    private readonly hookService: HookService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Очистка старых логов webhook-ов каждый день в 02:00
   */
  @Cron('0 2 * * *')
  async cleanupWebhookLogs() {
    console.log('Starting webhook logs cleanup...');
    
    try {
      const daysToKeep = parseInt(process.env.WEBHOOK_LOGS_RETENTION_DAYS || '30', 10);
      const deletedCount = await this.webhookLoggingService.cleanupOldLogs(daysToKeep);
      
      console.log(`Cleaned up ${deletedCount} old webhook log entries (older than ${daysToKeep} days)`);
    } catch (error) {
      console.error('Error during webhook logs cleanup:', error);
    }
  }

  /**
   * Повторная отправка неуспешных webhook-ов каждые 5 минут
   */
  @Cron('*/5 * * * *')
  async retryFailedWebhooks() {
    console.log('Checking for failed webhooks to retry...');
    
    try {
      const failedWebhooks = await this.webhookLoggingService.getFailedWebhooks(100);
      
      if (failedWebhooks.length === 0) {
        return;
      }

      console.log(`Found ${failedWebhooks.length} failed webhooks to retry`);

      for (const webhookLog of failedWebhooks) {
        await this.retryWebhook(webhookLog);
      }
    } catch (error) {
      console.error('Error during webhook retry process:', error);
    }
  }

  /**
   * Мониторинг здоровья webhook-ов каждый час
   */
  @Cron('0 * * * *')
  async monitorWebhookHealth() {
    console.log('Monitoring webhook health...');
    
    try {
      // Получаем все активные cashbox-ы
      const activeCashboxes = await this.prisma.cashbox.findMany({
        where: { is_active: true },
        include: {
          hooks: {
            where: { is_active: true },
          },
        },
      });

      for (const cashbox of activeCashboxes) {
        if (cashbox.hooks.length === 0) continue;

        const stats = await this.webhookLoggingService.getOverallStats(cashbox.id);
        
        if (stats && stats.total_attempts > 0) {
          const successRate = (stats.successful_attempts / stats.total_attempts) * 100;
          
          if (successRate < 70) {
            console.warn(`LOW WEBHOOK SUCCESS RATE for cashbox ${cashbox.id} (${cashbox.name}): ${successRate.toFixed(2)}%`);
            
            // Здесь можно добавить отправку уведомлений админам
            // await this.notifyAdminAboutWebhookIssues(cashbox, successRate);
          }
        }
      }
    } catch (error) {
      console.error('Error during webhook health monitoring:', error);
    }
  }

  /**
   * Отчет о webhook-ах каждый день в 9:00
   */
  @Cron('0 9 * * *')
  async generateDailyWebhookReport() {
    console.log('Generating daily webhook report...');
    
    try {
      const activeCashboxes = await this.prisma.cashbox.findMany({
        where: { is_active: true },
        include: {
          hooks: {
            where: { is_active: true },
          },
          company: true,
        },
      });

      const report = {
        date: new Date().toISOString().split('T')[0],
        totalCashboxes: activeCashboxes.length,
        totalHooks: activeCashboxes.reduce((sum, cb) => sum + cb.hooks.length, 0),
        cashboxStats: [],
      };

      for (const cashbox of activeCashboxes) {
        if (cashbox.hooks.length === 0) continue;

        const [dailyStats, overallStats] = await Promise.all([
          this.webhookLoggingService.getWebhookStats(cashbox.id, 1), // Статистика за день
          this.webhookLoggingService.getOverallStats(cashbox.id),
        ]);

        report.cashboxStats.push({
          cashboxId: cashbox.id,
          cashboxName: cashbox.name,
          companyName: cashbox.company.trade_name,
          publicId: cashbox.public_id,
          configuredHooks: cashbox.hooks.length,
          dailyStats,
          overallStats,
        });
      }

      console.log('Daily webhook report:', JSON.stringify(report, null, 2));
      
      // Здесь можно сохранить отчет в базу или отправить в телегу
      // await this.saveReport(report);
      // await this.emailReport(report);
      
    } catch (error) {
      console.error('Error generating daily webhook report:', error);
    }
  }

  /**
   * Повторная отправка конкретного webhook-а
   */
  private async retryWebhook(webhookLog: any) {
    try {
      // Проверяем, прошло ли достаточно времени с последней попытки
      const lastAttempt = new Date(webhookLog.created_at);
      const now = new Date();
      const minutesSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / (1000 * 60);
      
      // Интервалы повторов: 1, 2, 5, 10, 30 минут
      const retryIntervals = [1, 2, 5, 10, 30];
      const attemptIndex = Math.min(webhookLog.attempt_number - 1, retryIntervals.length - 1);
      const requiredInterval = retryIntervals[attemptIndex];
      
      if (minutesSinceLastAttempt < requiredInterval) {
        return; // Еще рано для повтора
      }

      console.log(`Retrying webhook: ${webhookLog.webhook_type} for transaction ${webhookLog.transaction_id}, attempt ${webhookLog.attempt_number + 1}`);
      
      // Получаем данные для повторной отправки
      const transaction = await this.prisma.transaction.findFirst({
        where: { id: webhookLog.transaction_id },
        include: { card: true, ip: true, cashbox: true },
      });

      if (!transaction) {
        console.warn(`Transaction ${webhookLog.transaction_id} not found for webhook retry`);
        return;
      }

      const hook = await this.prisma.hook.findFirst({
        where: { id: webhookLog.hook_id },
      });

      if (!hook || !hook.is_active) {
        console.warn(`Hook ${webhookLog.hook_id} not found or inactive for webhook retry`);
        return;
      }

      // Отправляем webhook
      await this.hookService.sendHook(
        hook.url,
        webhookLog.webhook_type as any,
        transaction.cashbox.webhook_api_secret || transaction.cashbox.password_api,
        transaction,
        transaction.card,
        transaction.ip,
        transaction.json_data,
        undefined,
        undefined,
        hook.id,
      );
      
    } catch (error) {
      console.error(`Error retrying webhook ${webhookLog.id}:`, error);
    }
  }

  /**
   * Уведомление админов о проблемах с webhook-ами (можно реализовать)
   */
  private async notifyAdminAboutWebhookIssues(cashbox: any, successRate: number) {
    // Здесь можно реализовать отправку уведомлений админам
    
    console.log(`Notification: Webhook success rate for ${cashbox.name} is ${successRate.toFixed(2)}%`);
  }
}