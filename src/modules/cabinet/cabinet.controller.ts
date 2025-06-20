import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CabinetService } from './cabinet.service';
import { TransactionListDto } from './dto/transaction-list.dto';
import { IAdminReq } from 'src/common/interfaces/adminReq.interface';
import { RefundDto } from '../payments/dto/refund.dto';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookLoggingService } from '../hook/webhook-logging.service';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Cabinet')
@UseGuards(AdminGuard)
@Controller('cabinet')
export class CabinetController {
  constructor(
    private readonly cabinetService: CabinetService,
    private readonly paymentService: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly webhookLoggingService: WebhookLoggingService,
  ) {}

  @Get('transaction')
  async transactionList(
    @Query() dto: TransactionListDto,
    @Req() req: IAdminReq,
  ) {
    return this.cabinetService.transactionList(dto, req);
  }

  @Post('revert')
  async revert(@Body() dto: RefundDto, @Req() req: IAdminReq) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: +dto.TransactionId,
        cashbox: {
          is_active: true,
          company: {
            admins: {
              some: { admin: { id: req.adminId, deactivated_at: null } },
            },
          },
        },
      },
      include: { cashbox: true },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    await this.paymentService.refund(dto, transaction.cashbox.id);
    return { Success: true, Message: null };
  }

  /**
   * Дашборд webhook-ов для админа
   */
  @Get('webhooks/dashboard')
  @ApiOperation({ summary: 'Get webhooks dashboard for admin' })
  async getWebhooksDashboard(@Req() req: IAdminReq) {
    // Получаем все cashbox-ы, доступные администратору
    const cashboxes = await this.prisma.cashbox.findMany({
      where: {
        is_active: true,
        company: {
          admins: {
            some: { admin: { id: req.adminId, deactivated_at: null } },
          },
        },
      },
      include: {
        hooks: {
          where: { is_active: true },
        },
      },
    });

    // Собираем статистику по всем cashbox-ам
    const dashboardData = await Promise.all(
      cashboxes.map(async (cashbox) => {
        const [stats, failures, overallStats] = await Promise.all([
          this.webhookLoggingService.getWebhookStats(cashbox.id, 7),
          this.webhookLoggingService.getRecentFailures(cashbox.id, 5),
          this.webhookLoggingService.getOverallStats(cashbox.id),
        ]);

        return {
          cashboxId: cashbox.id,
          cashboxName: cashbox.name,
          publicId: cashbox.public_id,
          configuredHooks: cashbox.hooks.length,
          hookTypes: cashbox.hooks.map(h => h.type),
          weeklyStats: stats,
          recentFailures: failures,
          overallStats,
        };
      })
    );

    return {
      username: req.adminUsername,
      totalCashboxes: cashboxes.length,
      cashboxes: dashboardData,
      summary: this.calculateSummaryStats(dashboardData),
    };
  }

  /**
   * Детальная информация о webhook-ах для конкретного cashbox
   */
  @Get('webhooks/cashbox/:cashboxId')
  @ApiOperation({ summary: 'Get detailed webhook info for cashbox' })
  async getCashboxWebhookDetails(
    @Param('cashboxId') cashboxId: string,
    @Query('days') days: string = '7',
    @Req() req: IAdminReq,
  ) {
    // Проверяем доступ администратора к этому cashbox
    const cashbox = await this.prisma.cashbox.findFirst({
      where: {
        id: +cashboxId,
        is_active: true,
        company: {
          admins: {
            some: { admin: { id: req.adminId, deactivated_at: null } },
          },
        },
      },
      include: {
        hooks: {
          where: { is_active: true },
        },
      },
    });

    if (!cashbox) {
      throw new NotFoundException('Cashbox not found or access denied');
    }

    const daysNumber = parseInt(days, 10);
    
    const [weeklyStats, failures, overallStats] = await Promise.all([
      this.webhookLoggingService.getWebhookStats(+cashboxId, daysNumber),
      this.webhookLoggingService.getRecentFailures(+cashboxId, 20),
      this.webhookLoggingService.getOverallStats(+cashboxId),
    ]);

    return {
      cashbox: {
        id: cashbox.id,
        name: cashbox.name,
        publicId: cashbox.public_id,
      },
      hooks: cashbox.hooks.map(h => ({
        id: h.id,
        type: h.type,
        url: h.url,
        isActive: h.is_active,
      })),
      statistics: {
        period: `${daysNumber} days`,
        weeklyStats,
        overallStats,
      },
      recentFailures: failures,
      healthStatus: this.calculateHealthStatus(overallStats),
    };
  }

  /**
   * История webhook-ов для конкретной транзакции
   */
  @Get('webhooks/transaction/:transactionId')
  @ApiOperation({ summary: 'Get webhook history for transaction' })
  async getTransactionWebhooks(
    @Param('transactionId') transactionId: string,
    @Req() req: IAdminReq,
  ) {
    // Проверяем доступ к транзакции
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: +transactionId,
        cashbox: {
          is_active: true,
          company: {
            admins: {
              some: { admin: { id: req.adminId, deactivated_at: null } },
            },
          },
        },
      },
      include: {
        cashbox: true,
        card: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found or access denied');
    }

    const webhookHistory = await this.webhookLoggingService.getTransactionWebhookHistory(+transactionId);

    return {
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        invoiceId: transaction.invoice_id,
        createdAt: transaction.created_at,
        cashboxName: transaction.cashbox.name,
      },
      webhookHistory,
      summary: this.calculateTransactionWebhookSummary(webhookHistory),
    };
  }

  /**
   * Получение неуспешных webhook-ов, требующих внимания
   */
  @Get('webhooks/alerts')
  @ApiOperation({ summary: 'Get webhook alerts for admin' })
  async getWebhookAlerts(@Req() req: IAdminReq) {
    // Получаем все cashbox-ы администратора
    const cashboxes = await this.prisma.cashbox.findMany({
      where: {
        is_active: true,
        company: {
          admins: {
            some: { admin: { id: req.adminId, deactivated_at: null } },
          },
        },
      },
    });

    const alerts = await Promise.all(
      cashboxes.map(async (cashbox) => {
        const failures = await this.webhookLoggingService.getRecentFailures(cashbox.id, 10);
        
        // Фильтруем только критичные проблемы (много неудачных попыток)
        const criticalFailures = failures.filter((f: any) => f.attempt_number >= 5);
        
        if (criticalFailures.length > 0) {
          return {
            cashboxId: cashbox.id,
            cashboxName: cashbox.name,
            criticalFailures: criticalFailures.length,
            totalFailures: failures.length,
            failures: criticalFailures.slice(0, 5), // Показываем только 5 самых критичных
          };
        }
        return null;
      })
    );

    return {
      username: req.adminUsername,
      alerts: alerts.filter(alert => alert !== null),
      totalAlerts: alerts.filter(alert => alert !== null).length,
    };
  }

  /**
   * Вспомогательные методы
   */
  private calculateSummaryStats(dashboardData: any[]) {
    let totalHooks = 0;
    let totalAttempts = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    dashboardData.forEach(data => {
      totalHooks += data.configuredHooks;
      if (data.overallStats) {
        totalAttempts += data.overallStats.total_attempts || 0;
        totalSuccessful += data.overallStats.successful_attempts || 0;
        totalFailed += data.overallStats.failed_attempts || 0;
      }
    });

    return {
      totalHooks,
      totalAttempts,
      totalSuccessful,
      totalFailed,
      successRate: totalAttempts > 0 ? Math.round((totalSuccessful / totalAttempts) * 100) : 0,
    };
  }

  private calculateHealthStatus(stats: any): string {
    if (!stats || !stats.total_attempts) {
      return 'NO_DATA';
    }

    const successRate = (stats.successful_attempts / stats.total_attempts) * 100;
    
    if (successRate >= 95) return 'EXCELLENT';
    if (successRate >= 85) return 'GOOD';
    if (successRate >= 70) return 'WARNING';
    return 'CRITICAL';
  }

  private calculateTransactionWebhookSummary(webhookHistory: any[]) {
    const total = webhookHistory.length;
    const successful = webhookHistory.filter((h: any) => h.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      uniqueWebhookTypes: [...new Set(webhookHistory.map((h: any) => h.webhook_type))],
    };
  }
}