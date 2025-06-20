import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEmail, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PayerDto } from '../../../common/interfaces/payer.interface';

export class TopupCryptogramDto {
  @ApiProperty({ description: 'Криптограмма платежных данных' })
  @IsNotEmpty()
  @IsString()
  CardCryptogramPacket: string;

  @ApiProperty({ description: 'Сумма платежа в валюте, разделитель точка' })
  @IsNotEmpty()
  @IsNumber()
  Amount: number;

  @ApiProperty({ description: 'Валюта: UZS' })
  @IsNotEmpty()
  @IsString()
  Currency: string = 'UZS';

  @ApiPropertyOptional({ description: 'Имя держателя карты латиницей' })
  @IsOptional()
  @IsString()
  Name?: string;

  @ApiPropertyOptional({ description: 'Идентификатор пользователя' })
  @IsOptional()
  @IsString()
  AccountId?: string;

  @ApiPropertyOptional({ description: 'E-mail плательщика, на который будет отправлена квитанция об оплате' })
  @IsOptional()
  @IsEmail()
  Email?: string;

  @ApiPropertyOptional({ description: 'Любые другие данные, которые будут связаны с транзакцией' })
  @IsOptional()
  JsonData?: object;

  @ApiPropertyOptional({ description: 'Номер заказа в вашей системе' })
  @IsOptional()
  @IsString()
  InvoiceId?: string;

  @ApiPropertyOptional({ description: 'Описание оплаты в свободной форме' })
  @IsOptional()
  @IsString()
  Description?: string;

  @ApiPropertyOptional({ 
    type: PayerDto,
    description: 'Доп. поле, куда передается информация о плательщике'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayerDto)
  Payer?: PayerDto;

  @ApiPropertyOptional({ 
    type: PayerDto,
    description: 'Доп. поле, куда передается информация о получателе'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayerDto)
  Receiver?: PayerDto;
}