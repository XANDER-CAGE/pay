import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail, IsUrl, IsEnum, IsBoolean, ValidateNested, IsIP } from 'class-validator';
import { Type } from 'class-transformer';
import { PayerDto } from '../../../common/interfaces/payer.interface';

enum Currency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP', 
  UZS = 'UZS'
}

enum CultureName {
  RU_RU = 'ru-RU',
  EN_US = 'en-US',
  UZ_UZ = 'uz-UZ'
}

export class CardsHoldDto {
  @ApiProperty({ description: 'Сумма платежа в валюте, разделитель точка' })
  @IsNotEmpty()
  @IsNumber()
  Amount: number;

  @ApiPropertyOptional({ 
    enum: Currency,
    description: 'Валюта: RUB/USD/EUR/GBP/UZS. По умолчанию UZS',
    default: Currency.UZS
  })
  @IsOptional()
  @IsEnum(Currency)
  Currency?: Currency = Currency.UZS;

  @ApiProperty({ description: 'IP-адрес плательщика' })
  @IsNotEmpty()
  @IsIP()
  IpAddress: string;

  @ApiProperty({ description: 'Криптограмма платежных данных' })
  @IsNotEmpty()
  @IsString()
  CardCryptogramPacket: string;

  @ApiPropertyOptional({ description: 'Имя держателя карты латиницей' })
  @IsOptional()
  @IsString()
  Name?: string;

  @ApiPropertyOptional({ description: 'Адрес сайта, с которого совершается вызов скрипта checkout' })
  @IsOptional()
  @IsUrl()
  PaymentUrl?: string;

  @ApiPropertyOptional({ description: 'Номер счета или заказа' })
  @IsOptional()
  @IsString()
  InvoiceId?: string;

  @ApiPropertyOptional({ description: 'Описание оплаты в свободной форме' })
  @IsOptional()
  @IsString()
  Description?: string;

  @ApiPropertyOptional({ 
    enum: CultureName,
    description: 'Язык уведомлений',
    default: CultureName.RU_RU
  })
  @IsOptional()
  @IsEnum(CultureName)
  CultureName?: CultureName = CultureName.RU_RU;

  @ApiPropertyOptional({ description: 'Обязательный идентификатор пользователя для создания подписки и получения токена' })
  @IsOptional()
  @IsString()
  AccountId?: string;

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
  JsonData?: object;

  @ApiPropertyOptional({ 
    description: 'Признак сохранения карточного токена для проведения оплаты по сохранённой карте',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  SaveCard?: boolean = false;
}