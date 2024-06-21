import { Injectable } from '@nestjs/common';
import { card, cashbox, ip, payment } from '@prisma/client';
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

  async payByTokenTEST(payment: payment, card: card, cashbox: cashbox, ip: ip) {
    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: card.expiry,
      CardType: card.processing,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: 'humo',
      InvoiceId: payment.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.masked_pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: payment.id,
    };
    const results: CoreApiResponse[] = [
      CoreApiResponse.doNotHonor(data),
      CoreApiResponse.insufficentFunds(data),
      CoreApiResponse.notPermitted(),
      CoreApiResponse.issuerNotFound(data),
      CoreApiResponse.success(data),
    ];
    const model = results[Math.floor(Math.random() * results.length + 1)];
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
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

  async refundTEST(payment: payment) {
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        refunded_date: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async cancelHoldTEST(payment: payment) {
    await this.prisma.payment.update({
      where: {
        id: payment.id,
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

  async confirmHoldTEST(payment: payment, amount: number, card: card) {
    await this.prisma.payment.update({
      where: {
        id: payment.id,
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
        cashbox_id: payment.cashbox_id,
        is_active: true,
        type: 'confirm',
      },
    });
    if (confirmHook) {
      const updatedPayment = await this.prisma.payment.findFirst({
        where: { id: payment.id },
      });
      this.hookService.hook(confirmHook.url, 'Payment', updatedPayment, card);
    }
    return {
      Success: true,
      Message: null,
    };
  }

  async holdTEST(payment: payment, card: card, ip: ip, cashbox: cashbox) {
    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: '12/90',
      CardType: card.processing,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: card.processing,
      InvoiceId: payment.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.masked_pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: payment.id,
    };

    await this.prisma.payment.update({
      where: {
        id: payment.id,
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

  async handle3dsTEST(payment: payment, card: card, ip: ip, cashbox: cashbox) {
    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: '12/90',
      CardType: card.processing,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: card.bank_name,
      InvoiceId: payment.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.masked_pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: payment.id,
    };
    const updatedPayment = await this.prisma.payment.update({
      where: {
        id: payment.id,
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
      amount: Number(payment.amount),
      balance: '1000000',
      cashboxName: cashbox.name,
      pan: card.masked_pan,
      phone: card.phone,
      processing: card.processing,
    });
    return CoreApiResponse.success(data);
  }
}
