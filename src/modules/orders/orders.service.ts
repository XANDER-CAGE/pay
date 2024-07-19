import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationService } from '../notification/notification.service';
import { MyReq } from 'src/common/interfaces/myReq.interface';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOrder(dto: CreateOrderDto, req: MyReq) {
    const uniqueId = generateUniqueId();
    const defaultDescription =
      dto.Description || 'Оплата в ' + req.company.trade_name;
    const defaultInvoice = dto.InvoiceId || Date.now().toString();
    const pk = req.cashbox.public_id;
    const url = `https://widget.gpay.uz/?publicId=${pk}&amount=${
      dto.Amount
    }&currency=UZS&description=${defaultDescription
      .split(' ')
      .join(
        '%',
      )}&email=kaspergreen123%40gmail.com&invoiceId=${defaultInvoice}&accountId=${
      dto.AccountId
    }&skin=classic`;
    const isoWithoutZ = new Date().toISOString().slice(0, -1);
    const createdOrder = await this.prisma.order.create({
      data: {
        unique_id: uniqueId,
        amount: dto.Amount,
        currency: dto.Currency ?? 'UZS',
        description: defaultDescription,
        email: dto.Email,
        require_confirmation: dto.RequireConfirmation,
        send_email: dto.SendEmail,
        invoice_id: defaultInvoice,
        account_id: dto.AccountId,
        offer_uri: dto.OfferUri,
        phone: dto.Phone,
        send_sms: dto.SendSms,
        send_viber: dto.SendViber,
        culture_name: dto.CultureName,
        subscription_behavior: dto.SubscriptionBehavior,
        success_redirect_url: dto.SuccessRedirectUrl,
        fail_redirect_url: dto.FailRedirectUrl,
        json_data: dto.JsonData,
        url,
        created_date_iso: isoWithoutZ,
        status_code: 0,
        status: 'Created',
        internal_id: Math.floor(Math.random() * 100000),
      },
    });
    if (dto.SendSms || dto.Phone) {
      await this.notificationService.send(
        dto.Phone,
        `Ссылка для оплаты ${url}`,
      );
    }
    return {
      Model: {
        Id: createdOrder.unique_id,
        Number: createdOrder.internal_id,
        Amount: createdOrder.amount,
        Currency: createdOrder.currency,
        CurrencyCode: 0,
        Email: createdOrder.email,
        Phone: createdOrder.phone ?? '',
        Description: createdOrder.description,
        RequireConfirmation: createdOrder.require_confirmation,
        Url: createdOrder.url,
        CultureName: createdOrder.culture_name ?? 'ru-RU',
        CreatedDate: `/Date(${new Date(
          createdOrder.created_date_iso,
        ).getTime()})/`,
        CreatedDateIso: createdOrder.created_date_iso,
        PaymentDate: createdOrder.payment_date ?? null,
        PaymentDateIso: createdOrder.payment_date_iso ?? null,
        StatusCode: createdOrder.status_code,
        Status: createdOrder.status,
        InternalId: createdOrder.internal_id,
      },
      Success: true,
      Message: null,
    };
  }

  async getOrderById(uniqueId: string) {
    return this.prisma.order.findFirst({
      where: { unique_id: uniqueId },
    });
  }
}

function generateUniqueId() {
  return Math.random().toString(36).substring(2, 15);
}
