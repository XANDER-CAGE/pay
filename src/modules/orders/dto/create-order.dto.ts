import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsJSON,
  IsNumber,
  IsPhoneNumber,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 10.0 })
  @IsNumber()
  Amount: number;

  @ApiProperty({ example: 'UZS', required: false })
  @IsString()
  Currency?: string;

  @ApiProperty({ example: 'Оплата на сайте example.com' })
  @IsString()
  Description: string;

  @ApiProperty({ example: 'client@test.local', required: false })
  @IsEmail()
  Email?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  RequireConfirmation?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  SendEmail?: boolean;

  @ApiProperty({ example: '12345', required: false })
  @IsString()
  InvoiceId?: string;

  @ApiProperty({ example: 'user123', required: false })
  @IsString()
  AccountId?: string;

  @ApiProperty({ example: 'https://example.com/offer', required: false })
  @IsString()
  OfferUri?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsPhoneNumber()
  Phone?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  SendSms?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  SendViber?: boolean;

  @ApiProperty({ example: 'ru-RU', required: false })
  @IsString()
  CultureName?: string;

  @ApiProperty({ example: 'CreateMonthly', required: false })
  @IsString()
  SubscriptionBehavior?: string;

  @ApiProperty({ example: 'https://example.com/success', required: false })
  @IsUrl()
  SuccessRedirectUrl?: string;

  @ApiProperty({ example: 'https://example.com/fail', required: false })
  @IsUrl()
  FailRedirectUrl?: string;

  @ApiProperty({ required: false })
  @IsJSON()
  JsonData?: string;
}
