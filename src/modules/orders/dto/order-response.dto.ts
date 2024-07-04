import { ApiProperty } from '@nestjs/swagger';

export class OrderResponseDto {
  @ApiProperty({ example: 'gASGZVgUN21hcpPF', description: 'Уникальный идентификатор заказа' })
  Id: string;

  @ApiProperty({ example: 2130, description: 'Внутренний номер заказа' })
  Number: number;

  @ApiProperty({ example: 10.0, description: 'Сумма платежа' })
  Amount: number;

  @ApiProperty({ example: 'RUB', description: 'Валюта платежа' })
  Currency: string;

  @ApiProperty({ example: 0, description: 'Код валюты' })
  CurrencyCode: number;

  @ApiProperty({ example: 'client@test.local', description: 'E-mail плательщика' })
  Email: string;

  @ApiProperty({ example: '', description: 'Телефон плательщика' })
  Phone: string;

  @ApiProperty({ example: 'Оплата на сайте example.com', description: 'Описание платежа' })
  Description: string;

  @ApiProperty({ example: true, description: 'Требуется подтверждение' })
  RequireConfirmation: boolean;

  @ApiProperty({ example: 'https://orders.gpay.uz/d/gASGZVgUN21hcpPF', description: 'URL для оплаты' })
  Url: string;

  @ApiProperty({ example: 'ru-RU', description: 'Язык уведомлений' })
  CultureName: string;

  @ApiProperty({ example: '/Date(1635835930555)/', description: 'Дата создания' })
  CreatedDate: string;

  @ApiProperty({ example: '2021-11-02T09:52:10', description: 'Дата создания в формате ISO' })
  CreatedDateIso: string;

  @ApiProperty({ example: null, description: 'Дата платежа' })
  PaymentDate: string;

  @ApiProperty({ example: null, description: 'Дата платежа в формате ISO' })
  PaymentDateIso: string;

  @ApiProperty({ example: 0, description: 'Код статуса' })
  StatusCode: number;

  @ApiProperty({ example: 'Created', description: 'Статус заказа' })
  Status: string;

  @ApiProperty({ example: 12272915, description: 'Внутренний идентификатор' })
  InternalId: number;
}
