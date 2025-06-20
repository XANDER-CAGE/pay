import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
  UnauthorizedException,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HookService } from './hook.service';
import { WebhookLoggingService } from './webhook-logging.service';
import { HookTestService } from './hook.test.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from 'src/common/guards/admin.guard';

// DTO для входящих webhook-ов (если нужно принимать webhook-и от внешних систем)
export class IncomingWebhookDto {
  [key: string]: any;
}

@ApiTags('Webhooks')
@Controller('hooks')
export class HookController {
  constructor(
    private readonly hookService: HookService,
    private readonly webhookLoggingService: WebhookLoggingService,
    private readonly hookTestService: HookTestService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Эндпоинт для приема webhook-ов от внешних систем
   */
  @Post('receive')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive webhook from external system' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async receiveWebhook(
    @Body() webhookData: IncomingWebhookDto,
    @Headers('x-content-hmac') xContentHmac?: string,
    @Headers('content-hmac') contentHmac?: string,
  ) {
    console.log('Received webhook:', webhookData);

    if (xContentHmac || contentHmac) {
      const bodyString = JSON.stringify(webhookData);
      const apiSecret = process.env.WEBHOOK_API_SECRET;

      if (!apiSecret) {
        throw new BadRequestException('API Secret not configured');
      }

      const signatureToVerify = xContentHmac || contentHmac;
      const isUrlEncoded = !!contentHmac && !xContentHmac;

      const isValidSignature = this.hookService.verifyHmacSignature(
        bodyString,
        signatureToVerify,
        apiSecret,
        isUrlEncoded,
      );

      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid HMAC signature');
      }
    }

    return { code: 0 };
  }

  /**
   * Тестирование webhook-а для транзакции
   */
  @UseGuards(AdminGuard)
  @Post('test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test webhook sending' })
  async testWebhook(
    @Body() testData: {
      transactionId: number;
      webhookUrl: string;
      hookType: string;
      cashboxId: number;
    },
  ) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: testData.transactionId },
      include: { card: true, ip: true, cashbox: true },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    const apiSecret = transaction.cashbox.password_api;

    const result = await this.hookService.sendHook(
      testData.webhookUrl,
      testData.hookType as any,
      apiSecret,
      transaction,
      transaction.card,
      transaction.ip,
    );

    return {
      success: result.success,
      code: result.code,
      message: result.message,
    };
  }

  /**
   * Получение статистики webhook-ов для касс
   */
  @UseGuards(AdminGuard)
  @Get('stats/:cashboxId')
  @ApiOperation({ summary: 'Get webhook statistics for cashbox' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days for statistics (default: 7)' })
  async getWebhookStats(
    @Param('cashboxId') cashboxId: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return this.hookTestService.getWebhookStatistics(+cashboxId, daysNumber);
  }

  /**
   * Получение истории webhook-ов для транзакции
   */
  @UseGuards(AdminGuard)
  @Get('history/transaction/:transactionId')
  @ApiOperation({ summary: 'Get webhook history for transaction' })
  async getTransactionWebhookHistory(@Param('transactionId') transactionId: string) {
    return this.webhookLoggingService.getTransactionWebhookHistory(+transactionId);
  }

  /**
   * Получение последних неудачных webhook-ов
   */
  @UseGuards(AdminGuard)
  @Get('failures/:cashboxId')
  @ApiOperation({ summary: 'Get recent webhook failures' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results (default: 50)' })
  async getRecentFailures(
    @Param('cashboxId') cashboxId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.webhookLoggingService.getRecentFailures(+cashboxId, limitNumber);
  }

  /**
   * Получение общей статистики
   */
  @UseGuards(AdminGuard)
  @Get('overview/:cashboxId')
  @ApiOperation({ summary: 'Get webhook overview statistics' })
  async getWebhookOverview(@Param('cashboxId') cashboxId: string) {
    const [stats, failures] = await Promise.all([
      this.webhookLoggingService.getOverallStats(+cashboxId),
      this.webhookLoggingService.getRecentFailures(+cashboxId, 10),
    ]);

    return {
      statistics: stats,
      recentFailures: failures,
      healthStatus: this.calculateHealthStatus(stats),
    };
  }

  /**
   * Тестирование всех webhook-ов для транзакции
   */
  @UseGuards(AdminGuard)
  @Post('test-all/:transactionId')
  @ApiOperation({ summary: 'Test all configured webhooks for transaction' })
  async testAllWebhooks(@Param('transactionId') transactionId: string) {
    return this.hookTestService.testAllWebhooks(+transactionId);
  }

  /**
   * Тестирование HMAC подписи
   */
  @UseGuards(AdminGuard)
  @Post('test-hmac')
  @ApiOperation({ summary: 'Test HMAC signature verification' })
  async testHmacVerification() {
    return this.hookTestService.testHmacVerification();
  }

  /**
   * Очистка старых логов
   */
  @UseGuards(AdminGuard)
  @Post('cleanup-logs')
  @ApiOperation({ summary: 'Cleanup old webhook logs' })
  async cleanupLogs(@Body() data: { daysToKeep?: number }) {
    const daysToKeep = data.daysToKeep || 30;
    const deletedCount = await this.webhookLoggingService.cleanupOldLogs(daysToKeep);
    
    return {
      message: `Cleaned up ${deletedCount} old webhook log entries`,
      deletedCount,
      daysToKeep,
    };
  }

  /**
   * Расчет статуса "здоровья" webhook-ов
   */
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
}