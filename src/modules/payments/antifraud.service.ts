import { PrismaService } from '../prisma/prisma.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AntifraudService {
  private transactionFrequencyLimit: number;
  private maxTransactionAmount: number;
  constructor(private readonly prisma: PrismaService) {
    this.transactionFrequencyLimit = 5; // Максимальное количество транзакций в час
    this.maxTransactionAmount = 10000; // Максимальная сумма транзакции
  }

  async checkForFraud(ipAddress: string, amount: number): Promise<boolean> {
    const isFrequencyHigh = await this.isTransactionFrequencyHigh(ipAddress);
    const isUnusualAmount = this.isUnusualTransactionAmount(amount);
    if (isFrequencyHigh || isUnusualAmount) {
      return true;
    }
    return false;
  }

  private async isTransactionFrequencyHigh(
    ipAddress: string,
  ): Promise<boolean> {
    // Получение временного диапазона (последний час)
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const transactionCount = await this.prisma.payment.count({
      where: {
        ip_address: ipAddress,
        created_at: {
          gte: oneHourAgo,
        },
      },
    });
    return transactionCount > this.transactionFrequencyLimit;
  }

  private isUnusualTransactionAmount(amount: number): boolean {
    return amount > this.maxTransactionAmount;
  }
}
