import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsEmail, IsIP, IsEnum, IsInt, IsJSON, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PayerDto } from '../../../common/interfaces/payer.interface';

enum Currency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR', 
  GBP = 'GBP',
  UZS = 'UZS'
}

export class PayByTokenDto {
  @ApiProperty({ description: 'Сумма платежа в валюте, разделитель точка' })
  @IsNotEmpty()
  @IsInt()
  Amount: number;

  @ApiPropertyOptional({ 
    enum: Currency,
    description: 'Валюта: RUB/USD/EUR/GBP/UZS. По умолчанию UZS',
    default: Currency.UZS
  })
  @IsOptional()
  @IsEnum(Currency)
  Currency?: Currency = Currency.UZS;

  @ApiProperty({ description: 'Идентификатор пользователя' })
  @IsNotEmpty()
  AccountId: string;

  @ApiProperty({ 
    description: 'Признак инициатора списания денежных средств',
    enum: [0, 1]
  })
  @IsNotEmpty()
  @IsInt()
  TrInitiatorCode: 0 | 1; // 0 - ТСП, 1 - держатель карты

  @ApiPropertyOptional({ 
    description: 'Признак оплаты по расписанию',
    enum: [0, 1],
    default: 0
  })
  @IsOptional()
  @IsInt()
  PaymentScheduled?: 0 | 1 = 0; // 0 - без расписания, 1 - по расписанию

  @ApiProperty({ description: 'Токен' })
  @IsNotEmpty()
  Token: string;

  @ApiPropertyOptional({ description: 'Номер счета или заказа' })
  @IsOptional()
  InvoiceId?: string;

  @ApiPropertyOptional({ description: 'Назначение платежа в свободной форме' })
  @IsOptional()
  Description?: string;

  @ApiPropertyOptional({ description: 'IP-адрес плательщика' })
  @IsOptional()
  @IsIP()
  IpAddress?: string;

  @ApiPropertyOptional({ description: 'E-mail плательщика, на который будет отправлена квитанция об оплате' })
  @IsOptional()
  @IsEmail()
  Email?: string;

  @ApiPropertyOptional({ 
    type: PayerDto,
    description: 'Доп. поле, куда передается информация о плательщике'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayerDto)
  Payer?: PayerDto;

  @ApiPropertyOptional({ description: 'Любые другие данные, которые будут связаны с транзакцией' })
  @IsOptional()
  @IsJSON()
  JsonData?: JSON;
}