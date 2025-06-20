import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PayerDto } from '../../../common/interfaces/payer.interface';

export class TopupTokenDto {
  @ApiProperty({ description: 'Токен карты, выданный системой после первого платежа' })
  @IsNotEmpty()
  @IsString()
  Token: string;

  @ApiProperty({ description: 'Сумма платежа в валюте, разделитель точка' })
  @IsNotEmpty()
  @IsNumber()
  Amount: number;

  @ApiProperty({ description: 'Идентификатор пользователя' })
  @IsNotEmpty()
  @IsString()
  AccountId: string;

  @ApiProperty({ description: 'Валюта: UZS' })
  @IsNotEmpty()
  @IsString()
  Currency: string = 'UZS';

  @ApiPropertyOptional({ description: 'Номер заказа в вашей системе' })
  @IsOptional()
  @IsString()
  InvoiceId?: string;

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