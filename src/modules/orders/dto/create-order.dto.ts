import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    example: 10.0,
    description:
      'Сумма платежа в валюте, разделитель точка. Количество не нулевых знаков после точки – 2',
  })
  Amount: number;

  @ApiProperty({
    example: 'RUB',
    description: 'Валюта RUB/USD/EUR/GBP',
    required: false,
  })
  Currency?: string;

  @ApiProperty({
    example: 'Оплата на сайте example.com',
    description: 'Назначение платежа в свободной форме',
  })
  Description: string;

  @ApiProperty({
    example: 'client@test.local',
    description: 'E-mail плательщика',
    required: false,
  })
  Email?: string;

  @ApiProperty({
    example: true,
    description: 'Платеж будет выполнен по двухстадийной схеме',
    required: false,
  })
  RequireConfirmation?: boolean;

  @ApiProperty({
    example: false,
    description: 'Плательщик получит письмо со ссылкой на оплату',
    required: false,
  })
  SendEmail?: boolean;

  @ApiProperty({
    example: '12345',
    description: 'Номер заказа в вашей системе',
    required: false,
  })
  InvoiceId?: string;

  @ApiProperty({
    example: 'user123',
    description: 'Идентификатор пользователя в вашей системе',
    required: false,
  })
  AccountId?: string;

  @ApiProperty({
    example: 'https://example.com/offer',
    description:
      'Ссылка на оферту, которая будет показываться на странице заказа',
    required: false,
  })
  OfferUri?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Номер телефона плательщика в произвольном формате',
    required: false,
  })
  Phone?: string;

  @ApiProperty({
    example: true,
    description: 'Плательщик получит СМС со ссылкой на оплату',
    required: false,
  })
  SendSms?: boolean;

  @ApiProperty({
    example: true,
    description: 'Плательщик получит сообщение в Viber со ссылкой на оплату',
    required: false,
  })
  SendViber?: boolean;

  @ApiProperty({
    example: 'ru-RU',
    description: 'Язык уведомлений',
    required: false,
  })
  CultureName?: string;

  @ApiProperty({
    example: 'CreateMonthly',
    description: 'Для создания платежа с подпиской',
    required: false,
  })
  SubscriptionBehavior?: string;

  @ApiProperty({
    example: 'https://example.com/success',
    description: 'Адрес страницы для редиректа при успешной оплате',
    required: false,
  })
  SuccessRedirectUrl?: string;

  @ApiProperty({
    example: 'https://example.com/fail',
    description: 'Адрес страницы для редиректа при неуспешной оплате',
    required: false,
  })
  FailRedirectUrl?: string;

  @ApiProperty({
    description:
      'Любые другие данные, которые будут связаны с транзакцией, в том числе инструкции для формирования онлайн-чека должны обёртываться в объект',
    required: false,
  })
  JsonData?: string;
}
