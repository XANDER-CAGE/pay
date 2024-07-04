import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    const uniqueId = generateUniqueId();

    const response = await this.prisma.order.create({
      data: {
        uniqueId,
        Amount: createOrderDto.Amount,
        Currency: createOrderDto.Currency ?? 'RUB',
        Description: createOrderDto.Description,
        Email: createOrderDto.Email,
        RequireConfirmation: createOrderDto.RequireConfirmation,
        SendEmail: createOrderDto.SendEmail,
        InvoiceId: createOrderDto.InvoiceId,
        AccountId: createOrderDto.AccountId,
        OfferUri: createOrderDto.OfferUri,
        Phone: createOrderDto.Phone,
        SendSms: createOrderDto.SendSms,
        SendViber: createOrderDto.SendViber,
        CultureName: createOrderDto.CultureName,
        SubscriptionBehavior: createOrderDto.SubscriptionBehavior,
        SuccessRedirectUrl: createOrderDto.SuccessRedirectUrl,
        FailRedirectUrl: createOrderDto.FailRedirectUrl,
        JsonData: createOrderDto.JsonData,
        Url: `https://orders.gpay.uz/d/${uniqueId}`,
        CreatedDateIso: new Date().toISOString(),
        StatusCode: 0,
        Status: 'Created',
        InternalId: Math.floor(Math.random() * 100000),
      },
    });
    return response;
  }

  async getOrder(id: string) {
    return this.prisma.order.findUnique({
      where: { uniqueId: id },
    });
  }
}

function generateUniqueId() {
  return Math.random().toString(36).substring(2, 15);
}
