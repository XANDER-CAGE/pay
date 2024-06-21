import { Injectable } from '@nestjs/common';
import { card, cashbox, ip, transaction } from '@prisma/client';
import { CoreApiResponse } from 'src/common/classes/model.class';
import { HookService } from '../hook/hook.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PaymentsTESTService {
  constructor(
    private readonly hookService: HookService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async payByTokenTEST(
    transaction: transaction,
    card: card,
    cashbox: cashbox,
    ip: ip,
  ) {
    const data = {
      AccountId: transaction.account_id,
      Amount: Number(transaction.amount),
      CardExpDate: card.expiry,
      CardType: card.processing,
      Date: transaction.created_at,
      Description: transaction.description,
      GatewayName: 'humo',
      InvoiceId: transaction.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: transaction.id,
    };
    const results: CoreApiResponse[] = [
      CoreApiResponse.doNotHonor(data),
      CoreApiResponse.insufficentFunds(data),
      CoreApiResponse.notPermitted(),
      CoreApiResponse.issuerNotFound(data),
      CoreApiResponse.success(data),
    ];
    const model = results[Math.floor(Math.random() * results.length + 1)];
    const updatedPayment = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: model.Success ? 'Completed' : 'Declined',
        processing_ref_num: 'test',
        is_test: true,
        reason_code: model.Model.ReasonCode,
        fail_reason: model.Model.Reason,
        last_amount: 1000000,
        updated_at: new Date(),
      },
    });
    if (model.Success) {
      const payHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'pay' },
      });
      if (payHook) {
        this.hookService.hook(payHook.url, 'Payment', updatedPayment, card);
      }
    } else {
      const failHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'fail' },
      });
      this.hookService.hook(failHook.url, 'Payment', updatedPayment, card);
    }
    return model;
  }

  async refundTEST(transaction: transaction) {
    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        refunded_date: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async cancelHoldTEST(transaction: transaction) {
    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'Cancelled',
        updated_at: new Date(),
      },
    });
    return {
      Success: true,
      Message: null,
    };
  }

  async confirmHoldTEST(transaction: transaction, amount: number, card: card) {
    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
        amount: amount,
      },
      data: {
        status: 'Completed',
        updated_at: new Date(),
        is_test: true,
      },
    });
    const confirmHook = await this.prisma.hook.findFirst({
      where: {
        cashbox_id: transaction.cashbox_id,
        is_active: true,
        type: 'confirm',
      },
    });
    if (confirmHook) {
      const updatedPayment = await this.prisma.transaction.findFirst({
        where: { id: transaction.id },
      });
      this.hookService.hook(confirmHook.url, 'Payment', updatedPayment, card);
    }
    return {
      Success: true,
      Message: null,
    };
  }

  async holdTEST(
    transaction: transaction,
    card: card,
    ip: ip,
    cashbox: cashbox,
  ) {
    const data = {
      AccountId: transaction.account_id,
      Amount: Number(transaction.amount),
      CardExpDate: '12/90',
      CardType: card.processing,
      Date: transaction.created_at,
      Description: transaction.description,
      GatewayName: card.processing,
      InvoiceId: transaction.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: transaction.id,
    };

    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'Authorized',
        processing_ref_num: 'test',
        hold_id: 'test',
        is_test: true,
        last_amount: 1000000,
        updated_at: new Date(),
      },
    });
    return CoreApiResponse.hold(data);
  }

  async handle3dsTEST(
    transaction: transaction,
    card: card,
    ip: ip,
    cashbox: cashbox,
  ) {
    const data = {
      AccountId: transaction.account_id,
      Amount: Number(transaction.amount),
      CardExpDate: '12/90',
      CardType: card.processing,
      Date: transaction.created_at,
      Description: transaction.description,
      GatewayName: card.bank_name,
      InvoiceId: transaction.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: transaction.id,
    };
    const updatedPayment = await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'Completed',
        processing_ref_num: 'test',
        last_amount: 1000000,
        reason_code: 0,
        card: {
          update: {
            data: { status: 'Approved', updated_at: new Date() },
          },
        },
        updated_at: new Date(),
      },
    });
    const payHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'pay' },
    });
    if (payHook) {
      this.hookService.hook(payHook.url, 'Payment', updatedPayment, card);
    }
    this.notificationService.sendSuccessSms({
      amount: Number(transaction.amount),
      balance: '1000000',
      cashboxName: cashbox.name,
      pan: card.pan,
      phone: card.phone,
      processing: card.processing,
    });
    return CoreApiResponse.success(data);
  }
}
