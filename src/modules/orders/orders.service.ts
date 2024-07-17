import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    const uniqueId = generateUniqueId();
    const createdOrder = await this.prisma.order.create({
      data: {
        unique_id: uniqueId,
        amount: createOrderDto.Amount,
        currency: createOrderDto.Currency ?? 'UZS',
        description: createOrderDto.Description,
        email: createOrderDto.Email,
        require_confirmation: createOrderDto.RequireConfirmation,
        send_email: createOrderDto.SendEmail,
        invoice_id: createOrderDto.InvoiceId,
        account_id: createOrderDto.AccountId,
        offer_uri: createOrderDto.OfferUri,
        phone: createOrderDto.Phone,
        send_sms: createOrderDto.SendSms,
        send_viber: createOrderDto.SendViber,
        culture_name: createOrderDto.CultureName,
        subscription_behavior: createOrderDto.SubscriptionBehavior,
        success_redirect_url: createOrderDto.SuccessRedirectUrl,
        fail_redirect_url: createOrderDto.FailRedirectUrl,
        json_data: createOrderDto.JsonData,
        url: `https://orders.gpay.uz/d/${uniqueId}`,
        created_date_iso: new Date().toISOString(),
        status_code: 0,
        status: 'Created',
        internal_id: Math.floor(Math.random() * 100000),
      },
    });

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
